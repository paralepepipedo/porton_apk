const sharp = require('sharp');
const { getUsuarioPorToken } = require('./_lib/auth');
const { supabase } = require('./_lib/supabase');
const { digestFetch } = require('./_lib/nvrDigest');

// Equivalente a _reducir_liviano() del app.py original: reduce a un ancho
// fijo y re-codifica en JPEG calidad 70, sin importar el peso original del
// substream del NVR. Si falla, se devuelve el original (igual que el try/except de Python).
async function reducirLiviano(buffer, anchoMax = 640, calidad = 70) {
  try {
    const metadata = await sharp(buffer).metadata();
    let pipeline = sharp(buffer).jpeg({ quality: calidad });
    if (metadata.width && metadata.width > anchoMax) {
      pipeline = pipeline.resize({ width: anchoMax });
    }
    return await pipeline.toBuffer();
  } catch (e) {
    return buffer;
  }
}

// Pide UNA sola foto al NVR (sin capturador en segundo plano, sin loop).
// Si el usuario quiere otra, el navegador vuelve a llamar a este mismo endpoint.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'] || req.query.token;
  const usuario = await getUsuarioPorToken(token);
  if (!usuario) {
    return res.status(401).json({ success: false, message: 'Sesion invalida' });
  }
  if (!usuario.habilitado) {
    return res.status(403).json({ success: false, message: usuario.mensaje_bloqueo || 'Acceso suspendido' });
  }

  const canal = parseInt(req.query.canal, 10) || 2;

  const { data: config, error } = await supabase
    .from('porton_nvr_config')
    .select('host, puerto_http, usuario, clave')
    .limit(1)
    .maybeSingle();

  if (error || !config) {
    return res.status(500).json({ success: false, message: 'Configuracion del NVR no disponible' });
  }

  const url = `http://${config.host}:${config.puerto_http}/cgi-bin/snapshot.cgi?channel=${canal}&subtype=1`;

  try {
    const nvrRes = await digestFetch(url, { method: 'GET', username: config.usuario, password: config.clave });
    if (!nvrRes.ok) {
      return res.status(502).json({ success: false, message: 'El NVR no respondio correctamente' });
    }
    const original = Buffer.from(await nvrRes.arrayBuffer());
    const reducido = await reducirLiviano(original);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(reducido);
  } catch (e) {
    return res.status(502).json({ success: false, message: 'No se pudo contactar al NVR' });
  }
};
