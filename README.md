# Porton APK - Backend

Backend minimo en Vercel Functions (sin framework) + panel web estatico, usando Supabase como
base de datos. Reemplaza al servidor Flask local (`V10 - rediseño/app.py`): este backend **solo**
maneja usuarios/login/admin. El video y la apertura del porton los hace la app Android,
conectando directo al NVR via NetSDK (no pasan por aqui).

## Variables de entorno requeridas

Configurar en Vercel (Project Settings -> Environment Variables), **nunca** en el repo:

- `SUPABASE_URL` - URL del proyecto Supabase (`porton_apk`).
- `SUPABASE_SERVICE_ROLE_KEY` - service_role key del mismo proyecto (clave privada, con acceso
  total a las tablas; por eso solo se usa en las funciones de `/api`, nunca en el navegador ni en el APK).

Ambas se obtienen en Supabase: Project Settings -> API.

Para probar en local, copiar `.env.local.example` a `.env.local` y completar los valores
(ese archivo esta en `.gitignore`, no se sube).

## Estructura

- `api/` - funciones serverless (login, verify, admin de usuarios/avisos/registros/estadisticas,
  entrega de config del NVR a la app).
- `public/` - paginas estaticas: `index.html` (login), `admin.html` (panel de administracion),
  `dashboard.html` (estadisticas).

## Esquema de base de datos (Supabase)

Tablas: `porton_usuarios`, `porton_registros`, `porton_avisos`, `porton_nvr_config`.
RLS esta activado sin politicas publicas: solo la service_role key (usada por las funciones)
puede leer/escribir. El cliente (navegador o APK) nunca habla directo con Supabase.

## Notas de la migracion

- Las contraseñas de usuario se mantienen en texto plano, por decision explicita del proyecto
  (no se usa hash).
- La configuracion del NVR es una sola cuenta global (no por usuario), igual que en la version
  Flask original.
- No se implemento push en tiempo real (SSE) que existia en la version Flask: Vercel Functions no
  mantiene conexiones persistentes. Avisos y suspensiones se ven al recargar o volver a loguearse,
  no al instante. Si se necesita tiempo real, se puede resolver despues con Supabase Realtime.
