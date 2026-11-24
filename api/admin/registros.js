const { requiereAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'];
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const { usuario_id } = req.query;

  let query = supabase
    .from('porton_registros')
    .select('id, nombre_usuario, fecha_hora, accion, usuario_id')
    .order('fecha_hora', { ascending: false })
    .limit(200);

  if (usuario_id) {
    query = query.eq('usuario_id', usuario_id);
  }

  const { data: registros, error } = await query;
  if (error) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }

  const idsUsuarios = [...new Set(registros.map(r => r.usuario_id).filter(Boolean))];
  let usuariosPorId = {};
  if (idsUsuarios.length > 0) {
    const { data: usuarios } = await supabase
      .from('porton_usuarios')
      .select('id, nombre, casa')
      .in('id', idsUsuarios);
    usuariosPorId = Object.fromEntries((usuarios || []).map(u => [u.id, u]));
  }

  const result = registros.map(r => ({
    id: r.id,
    nombre_usuario: r.nombre_usuario,
    fecha_hora: r.fecha_hora || '',
    accion: r.accion,
    nombre: usuariosPorId[r.usuario_id] ? usuariosPorId[r.usuario_id].nombre : null,
    casa: usuariosPorId[r.usuario_id] ? usuariosPorId[r.usuario_id].casa : null
  }));

  return res.status(200).json({ success: true, registros: result });
};
