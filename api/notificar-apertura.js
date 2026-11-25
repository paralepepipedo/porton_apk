const { getUsuarioPorToken } = require('./_lib/auth');
const { supabase } = require('./_lib/supabase');

// Canal de Supabase Realtime (broadcast) para avisar en vivo a los demas
// usuarios conectados que alguien esta abriendo el porton. Debe coincidir
// con el topic al que se suscribe la APK (ver protocolo websocket de
// Supabase Realtime en https://supabase.com/docs/guides/realtime/protocol).
const CANAL_EVENTOS = 'porton-eventos';

// La APK abre el porton hablando directo con el NVR (no pasa por Vercel,
// a diferencia de la webapp via api/alarm.js) -- por eso antes de esto
// las aperturas desde la APK no quedaban en porton_registros ni avisaban
// a nadie. Este endpoint se llama aparte, justo despues de abrir, solo
// para registrar y notificar; no abre nada por si mismo.
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

  await supabase.from('porton_registros').insert({
    usuario_id: usuario.id,
    nombre_usuario: usuario.nombre_usuario,
    accion: 'apertura'
  });

  // Broadcast via REST: no requiere mantener una conexion Realtime abierta
  // desde esta funcion sin estado (ver doc de Realtime, seccion broadcast).
  // Si falla, no debe romper nada -- la apertura real ya ocurrio antes de
  // llamar a este endpoint, esto es solo el aviso en vivo.
  try {
    await fetch(`${process.env.SUPABASE_URL}/realtime/v1/api/broadcast`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [{ topic: CANAL_EVENTOS, event: 'apertura', payload: { nombre: usuario.nombre_usuario } }]
      })
    });
  } catch (e) {
    // intencional: ver comentario de arriba
  }

  return res.status(200).json({ success: true });
};
