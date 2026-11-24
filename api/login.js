const crypto = require('crypto');
const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const body = req.body || {};
  const nombre_usuario = String(body.usuario || '').trim();
  const clave = String(body.contrasena || '').trim();

  if (!nombre_usuario || !clave) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  const { data: fila, error: errBusqueda } = await supabase
    .from('porton_usuarios')
    .select('*')
    .eq('nombre_usuario', nombre_usuario)
    .maybeSingle();

  if (errBusqueda) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }

  if (!fila || fila.contrasena !== clave) {
    if (fila) {
      const nuevosIntentos = (fila.intentos_fallidos || 0) + 1;
      await supabase
        .from('porton_usuarios')
        .update({ intentos_fallidos: nuevosIntentos })
        .eq('id', fila.id);

      const restantes = 5 - nuevosIntentos;
      if (restantes <= 0) {
        return res.status(401).json({ success: false, message: 'Cuenta bloqueada. Contacta al administrador.' });
      }
      return res.status(401).json({ success: false, message: `Usuario o contraseña incorrectos. Intentos restantes: ${restantes}` });
    }
    return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
  }

  if ((fila.intentos_fallidos || 0) >= 5) {
    return res.status(401).json({ success: false, message: 'Cuenta bloqueada. Contacta al administrador.' });
  }

  let token = fila.token;
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    await supabase
      .from('porton_usuarios')
      .update({ token, intentos_fallidos: 0 })
      .eq('id', fila.id);
  } else {
    await supabase
      .from('porton_usuarios')
      .update({ intentos_fallidos: 0 })
      .eq('id', fila.id);
  }

  return res.status(200).json({
    success: true,
    token,
    perfil: fila.perfil,
    habilitado: fila.habilitado,
    mensaje_bloqueo: fila.mensaje_bloqueo,
    nombre: fila.nombre || fila.nombre_usuario
  });
};
