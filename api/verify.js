const { getUsuarioPorToken } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const { token } = req.body || {};
  const usuario = await getUsuarioPorToken(token);

  if (!usuario) {
    return res.status(401).json({ success: false, message: 'Sesion invalida' });
  }

  return res.status(200).json({
    success: true,
    perfil: usuario.perfil,
    habilitado: usuario.habilitado,
    mensaje_bloqueo: usuario.mensaje_bloqueo,
    nombre: usuario.nombre || usuario.nombre_usuario
  });
};
