const { supabase } = require('./supabase');

async function getUsuarioPorToken(token) {
  if (!token) return null;
  const { data, error } = await supabase
    .from('porton_usuarios')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function requiereAdmin(token) {
  const usuario = await getUsuarioPorToken(token);
  if (usuario && usuario.perfil === 'admin') return usuario;
  return null;
}

module.exports = { getUsuarioPorToken, requiereAdmin };
