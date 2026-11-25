const { supabase } = require('./_lib/supabase');
const { requiereAdmin } = require('./_lib/auth');

const ESTILOS_VALIDOS = ['agua', 'fiesta', 'oficial', 'emergencia', 'jardin', 'elegante', 'informativo', 'personalizado'];
const BUCKET_ANUNCIOS = 'anuncios';
const MAX_IMAGEN_BASE64 = 4 * 1024 * 1024; // ~3MB de imagen real en base64

// Fusionado con el antiguo api/admin/aviso.js: el plan Hobby de Vercel
// permite como maximo 12 funciones serverless por deployment, y separar
// publico/admin en archivos aparte para cada feature nos hizo pasarnos
// (14 funciones) -- el build fallaba en silencio y la app seguia sirviendo
// el ultimo deploy bueno, sin avisar. Un mismo archivo puede manejar varios
// metodos sin gastar una funcion mas. Por la misma razon, el tablero de
// anuncios ("bandera", avisos multiples con estilo propio) tambien vive
// aqui en vez de en un archivo nuevo: se distingue por el query param
// ?lista=anuncios y ?accion=... El aviso unico de siempre (porton_avisos)
// no cambia en nada.

async function subirImagen(base64, tipo) {
  const base64Limpio = String(base64).replace(/^data:[^;]+;base64,/, '');
  if (base64Limpio.length > MAX_IMAGEN_BASE64) {
    throw new Error('La imagen es muy grande (maximo ~3MB).');
  }
  const buffer = Buffer.from(base64Limpio, 'base64');
  const extension = (tipo || 'image/jpeg').split('/')[1] || 'jpg';
  const ruta = `admin/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_ANUNCIOS)
    .upload(ruta, buffer, { contentType: tipo || 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET_ANUNCIOS).getPublicUrl(ruta);
  return data.publicUrl;
}

async function manejarListaAnuncios(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('porton_anuncios')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, anuncios: data || [] });
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).json({ success: false, message: 'Metodo no permitido' });
}

async function manejarAdminAnuncios(req, res, accion) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'];
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const body = req.body || {};

  if (accion === 'crear-anuncio') {
    const texto = String(body.texto || '').trim();
    const estilo = ESTILOS_VALIDOS.includes(body.estilo) ? body.estilo : 'oficial';
    if (!texto) return res.status(400).json({ success: false, message: 'El texto es obligatorio' });

    let imagen_url = null;
    if (body.imagen_base64) {
      try {
        imagen_url = await subirImagen(body.imagen_base64, body.imagen_tipo);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    const { count } = await supabase
      .from('porton_anuncios')
      .select('id', { count: 'exact', head: true });

    const { data, error } = await supabase
      .from('porton_anuncios')
      .insert({ texto, estilo, imagen_url, orden: count || 0, activo: true })
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, anuncio: data });
  }

  if (accion === 'actualizar-anuncio') {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });

    const cambios = {};
    if (typeof body.texto === 'string') cambios.texto = body.texto.trim();
    if (ESTILOS_VALIDOS.includes(body.estilo)) cambios.estilo = body.estilo;
    if (typeof body.activo === 'boolean') cambios.activo = body.activo;
    if (body.quitar_imagen) cambios.imagen_url = null;
    if (body.imagen_base64) {
      try {
        cambios.imagen_url = await subirImagen(body.imagen_base64, body.imagen_tipo);
      } catch (e) {
        return res.status(400).json({ success: false, message: e.message });
      }
    }

    const { data, error } = await supabase
      .from('porton_anuncios')
      .update(cambios)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, anuncio: data });
  }

  if (accion === 'eliminar-anuncio') {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });
    const { error } = await supabase.from('porton_anuncios').delete().eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true });
  }

  if (accion === 'reordenar-anuncios') {
    const orden = Array.isArray(body.orden) ? body.orden : [];
    for (let i = 0; i < orden.length; i++) {
      await supabase.from('porton_anuncios').update({ orden: i }).eq('id', orden[i]);
    }
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ success: false, message: 'Accion no reconocida' });
}

module.exports = async function handler(req, res) {
  const { lista, accion } = req.query;

  if (lista === 'anuncios') {
    if (req.method === 'GET') return manejarListaAnuncios(req, res);
    if (accion) return manejarAdminAnuncios(req, res, accion);
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('porton_avisos')
      .select('*')
      .eq('activo', true)
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
    return res.status(200).json({ success: true, aviso: data || null });
  }

  if (req.method === 'POST') {
    const token = req.headers['x-token'];
    const admin = await requiereAdmin(token);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const body = req.body || {};
    const mensaje = String(body.mensaje || '').trim();
    const activo = body.activo === undefined ? true : !!body.activo;

    // Desactiva todos los avisos anteriores (equivalente a "UPDATE avisos SET activo=0" sin WHERE)
    await supabase.from('porton_avisos').update({ activo: false }).neq('id', 0);

    if (mensaje) {
      const { error } = await supabase.from('porton_avisos').insert({ mensaje, activo });
      if (error) {
        return res.status(500).json({ success: false, message: error.message });
      }
    }

    return res.status(200).json({ success: true, message: 'Aviso guardado' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Metodo no permitido' });
};
