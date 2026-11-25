const { supabase } = require('./_lib/supabase');
const { requiereAdmin } = require('./_lib/auth');

const VALORES_VALIDOS = ['imagen', 'video', 'ambos'];

// Fusionado con el antiguo api/admin/modo-camara.js -- ver comentario en
// api/aviso.js (limite de 12 funciones serverless del plan Hobby de Vercel).
module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('porton_nvr_config')
      .select('modo_camara')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
    }
    return res.status(200).json({ success: true, modo_camara: data.modo_camara });
  }

  if (req.method === 'POST') {
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
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ success: false, message: 'Metodo no permitido' });
};
