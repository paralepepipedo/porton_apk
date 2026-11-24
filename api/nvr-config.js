const { getUsuarioPorToken } = require('./_lib/auth');
const { supabase } = require('./_lib/supabase');

// Usado por la APK (no por el navegador) despues del login: entrega la
// direccion y credenciales del NVR para que la app conecte directo por NetSDK.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'];
  const usuario = await getUsuarioPorToken(token);

  if (!usuario) {
    return res.status(401).json({ success: false, message: 'Sesion invalida' });
  }
  if (!usuario.habilitado) {
    return res.status(403).json({ success: false, message: usuario.mensaje_bloqueo || 'Acceso suspendido' });
  }

  const { data, error } = await supabase
    .from('porton_nvr_config')
    .select('host, puerto, puerto_http, usuario, clave')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(500).json({ success: false, message: 'Configuracion del NVR no disponible' });
  }

  return res.status(200).json({ success: true, nvr: data });
};
