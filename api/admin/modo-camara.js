const { requiereAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

const VALORES_VALIDOS = ['imagen', 'video', 'ambos'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const token = req.headers['x-token'];
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const modoCamara = String((req.body || {}).modo_camara || '').trim();
  if (!VALORES_VALIDOS.includes(modoCamara)) {
    return res.status(400).json({ success: false, message: 'modo_camara invalido' });
  }

  const { error } = await supabase
    .from('porton_nvr_config')
    .update({ modo_camara: modoCamara })
    .neq('host', '');

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.status(200).json({ success: true, message: 'Modo de camara guardado' });
};
