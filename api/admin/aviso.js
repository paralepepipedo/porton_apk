const { requiereAdmin } = require('../_lib/auth');
const { supabase } = require('../_lib/supabase');

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

  const body = req.body || {};
  const mensaje = String(body.mensaje || '').trim();
  const activo = body.activo === undefined ? true : !!body.activo;

  // Desactiva todos los avisos anteriores (equivalente a "UPDATE avisos SET activo=0" sin WHERE)
  await supabase.from('porton_avisos').update({ activo: false }).neq('id', 0);

  if (mensaje) {
    const { error } = await supabase
      .from('porton_avisos')
      .insert({ mensaje, activo });
    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  return res.status(200).json({ success: true, message: 'Aviso guardado' });
};
