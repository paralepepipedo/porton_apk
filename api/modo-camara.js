const { supabase } = require('./_lib/supabase');

// Publico (lo usa admin.html para mostrar el valor actual sin necesitar
// token de admin, igual que /api/aviso).
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const { data, error } = await supabase
    .from('porton_nvr_config')
    .select('modo_camara')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return res.status(500).json({ success: false, message: 'Configuracion no disponible' });
  }

  return res.status(200).json({ success: true, modo_camara: data.modo_camara });
};
