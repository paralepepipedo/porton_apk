const { supabase } = require('./_lib/supabase');
const { requiereAdmin } = require('./_lib/auth');

// Fusionado con el antiguo api/admin/aviso.js: el plan Hobby de Vercel
// permite como maximo 12 funciones serverless por deployment, y separar
// publico/admin en archivos aparte para cada feature nos hizo pasarnos
// (14 funciones) -- el build fallaba en silencio y la app seguia sirviendo
// el ultimo deploy bueno, sin avisar. Un mismo archivo puede manejar varios
// metodos sin gastar una funcion mas.
module.exports = async function handler(req, res) {
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
