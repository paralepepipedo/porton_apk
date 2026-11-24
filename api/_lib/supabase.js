const { createClient } = require('@supabase/supabase-js');

// Cliente con la service_role key: solo se ejecuta en el servidor (funciones de /api),
// nunca se expone al navegador ni al APK. Ignora RLS, por eso vive solo aqui.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabase };
