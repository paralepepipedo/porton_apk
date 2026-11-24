const { requiereAdmin } = require('../../_lib/auth');
const { supabase } = require('../../_lib/supabase');

const CAMPOS_EDITABLES = ['nombre_usuario', 'contrasena', 'perfil', 'nombre', 'telefono', 'correo', 'ppu', 'casa', 'mensaje_bloqueo'];

module.exports = async function handler(req, res) {
  const token = req.headers['x-token'];
  const admin = await requiereAdmin(token);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const { id } = req.query;

  if (req.method === 'PUT') {
    const body = req.body || {};
    const cambios = {};

    for (const campo of CAMPOS_EDITABLES) {
      if (campo in body) {
        cambios[campo] = body[campo];
        if (campo === 'contrasena') {
          cambios.intentos_fallidos = 0;
        }
      }
    }
    if ('habilitado' in body) {
      cambios.habilitado = !!body.habilitado;
    }

    if (Object.keys(cambios).length === 0) {
      return res.status(400).json({ success: false, message: 'Nada que actualizar' });
    }

    const { error } = await supabase
      .from('porton_usuarios')
      .update(cambios)
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, message: 'Error interno' });
    }

    return res.status(200).json({ success: true, message: 'Usuario actualizado' });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('porton_usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
    return res.status(200).json({ success: true, message: 'Usuario eliminado' });
  }

  res.setHeader('Allow', 'PUT, DELETE');
  return res.status(405).json({ success: false, message: 'Metodo no permitido' });
};
