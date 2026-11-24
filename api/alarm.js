const { getUsuarioPorToken } = require('./_lib/auth');
const { supabase } = require('./_lib/supabase');
const { digestFetch } = require('./_lib/nvrDigest');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Replica el ciclo del app.py original: enciende el rele (Start), espera 5s,
// lo apaga (Stop). El resto del conteo visual de 20s lo maneja el navegador.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'] || (req.body && req.body.token);
  const usuario = await getUsuarioPorToken(token);
  if (!usuario) {
    return res.status(401).json({ success: false, message: 'Sesion invalida' });
  }
  if (!usuario.habilitado) {
    return res.status(403).json({ success: false, message: usuario.mensaje_bloqueo || 'Acceso suspendido' });
  }

  const { data: config, error } = await supabase
    .from('porton_nvr_config')
    .select('host, puerto_http, usuario, clave')
    .limit(1)
    .maybeSingle();

  if (error || !config) {
    return res.status(500).json({ success: false, message: 'Configuracion del NVR no disponible' });
  }

  const base = `http://${config.host}:${config.puerto_http}/cgi-bin/configManager.cgi`;

  async function setAlarmOut(mode) {
    const url = `${base}?action=setConfig&AlarmOut[0].Mode=${mode}`;
    const r = await digestFetch(url, { method: 'GET', username: config.usuario, password: config.clave });
    return r.ok;
  }

  try {
    const okStart = await setAlarmOut(1);
    if (!okStart) {
      return res.status(502).json({ success: false, message: 'No se pudo accionar el porton' });
    }

    await supabase.from('porton_registros').insert({
      usuario_id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      accion: 'apertura'
    });

    await sleep(5000);
    await setAlarmOut(0);

    return res.status(200).json({ success: true, message: 'Porton abriendo' });
  } catch (e) {
    return res.status(502).json({ success: false, message: 'No se pudo contactar al NVR' });
  }
};
