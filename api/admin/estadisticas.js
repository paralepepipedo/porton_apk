const { requiereAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'] || req.query.token;
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const { data: registros, error } = await supabase
    .from('porton_registros')
    .select('fecha_hora, nombre_usuario, accion')
    .order('fecha_hora', { ascending: true });

  if (error) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }

  const { data: usuarios } = await supabase
    .from('porton_usuarios')
    .select('nombre_usuario, nombre, casa');

  const usuarioPorNombre = Object.fromEntries((usuarios || []).map(u => [u.nombre_usuario, u]));

  const todos = registros.map(r => ({
    fecha_hora: r.fecha_hora,
    nombre_usuario: r.nombre_usuario,
    accion: r.accion,
    nombre: usuarioPorNombre[r.nombre_usuario] ? usuarioPorNombre[r.nombre_usuario].nombre : null,
    casa: usuarioPorNombre[r.nombre_usuario] ? usuarioPorNombre[r.nombre_usuario].casa : null
  }));

  const total = todos.length;

  const conteoPorUsuario = {};
  for (const r of todos) {
    conteoPorUsuario[r.nombre_usuario] = (conteoPorUsuario[r.nombre_usuario] || 0) + 1;
  }
  const top_usuarios = Object.entries(conteoPorUsuario)
    .map(([nombre_usuario, total]) => ({
      nombre_usuario,
      nombre: usuarioPorNombre[nombre_usuario] ? usuarioPorNombre[nombre_usuario].nombre : null,
      casa: usuarioPorNombre[nombre_usuario] ? usuarioPorNombre[nombre_usuario].casa : null,
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const porMes = {};
  const porDiaSemana = {};
  const porHora = {};
  const porDia = {};
  const ahora = new Date();
  const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (const r of todos) {
    if (!r.fecha_hora) continue;
    const fecha = new Date(r.fecha_hora.replace(' ', 'T') + 'Z');
    if (isNaN(fecha.getTime())) continue;

    const mes = r.fecha_hora.slice(0, 7);
    porMes[mes] = (porMes[mes] || 0) + 1;

    const diaSemana = fecha.getUTCDay();
    porDiaSemana[diaSemana] = (porDiaSemana[diaSemana] || 0) + 1;

    const hora = fecha.getUTCHours();
    porHora[hora] = (porHora[hora] || 0) + 1;

    if (fecha >= hace30) {
      const dia = r.fecha_hora.slice(0, 10);
      porDia[dia] = (porDia[dia] || 0) + 1;
    }
  }

  const por_mes = Object.entries(porMes)
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, 12);

  const por_dia_semana = Object.entries(porDiaSemana)
    .map(([dia_semana, total]) => ({ dia_semana: Number(dia_semana), total }))
    .sort((a, b) => a.dia_semana - b.dia_semana);

  const por_hora = Object.entries(porHora)
    .map(([hora, total]) => ({ hora: Number(hora), total }))
    .sort((a, b) => a.hora - b.hora);

  const por_dia = Object.entries(porDia)
    .map(([dia, total]) => ({ dia, total }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  const rango = {
    primera: todos.length ? todos[0].fecha_hora : null,
    ultima: todos.length ? todos[todos.length - 1].fecha_hora : null
  };

  return res.status(200).json({
    success: true,
    total,
    todos,
    top_usuarios,
    por_mes,
    por_dia_semana,
    por_hora,
    por_dia,
    rango
  });
};
