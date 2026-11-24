const { supabase } = require('./_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  const { data, error } = await supabase
    .from('porton_avisos')
    .select('*')
    .eq('activo', true)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ success: false, message: error.message });
  }

  return res.status(200).json({ success: true, aviso: data || null });
};
