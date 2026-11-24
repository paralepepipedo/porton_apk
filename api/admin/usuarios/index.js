const { requiereAdmin } = require('../../_lib/auth');
const { supabase } = require('../../_lib/supabase');

module.exports = async function handler(req, res) {
  const token = req.headers['x-token'];
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('porton_usuarios')
      .select('id, nombre_usuario, perfil, habilitado, mensaje_bloqueo, nombre, telefono, correo, ppu, casa, fecha_creacion, intentos_fallidos')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
    return res.status(200).json({ success: true, usuarios: data });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const nombre_usuario = String(body.nombre_usuario || '').trim();
    const contrasena = String(body.contrasena || '').trim();
    const perfil = body.perfil || 'user';

    if (!nombre_usuario || !contrasena) {
      return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }

    const { data, error } = await supabase
      .from('porton_usuarios')
      .insert({
        nombre_usuario,
        contrasena,
        perfil,
        habilitado: true,
        nombre: body.nombre || '',
        telefono: body.telefono || '',
        correo: body.correo || '',
        ppu: body.ppu || '',
        casa: body.casa || ''
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, message: 'El nombre de usuario ya existe' });
      }
      return res.status(500).json({ success: false, message: 'Error interno' });
    }

    return res.status(200).json({ success: true, id: data.id, message: 'Usuario creado' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Metodo no permitido' });
};
