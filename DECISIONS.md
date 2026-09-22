# DECISIONS.md — Ruta Segura

## 2026-09-22 — Sesión de build F1–F6 + test plan

### Qué se decidió

- Proyecto scaffolded en `/Users/dulcegil/ruta-segura` (Next.js App
  Router + Tailwind + Supabase), siguiendo el patrón ya probado en el
  proyecto hermano `via-reparacion`.
- Esta versión de Next.js (16.x) deprecó `middleware.ts` a favor de
  `proxy.ts` — se usó la convención nueva desde el inicio.
- Supabase entrega ahora "publishable key" (`sb_publishable_...`) en vez
  de "anon key" — el código usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
  no `ANON_KEY`.
- F1: tabla `riders` con RLS (`auth.uid() = rider_id`), Google Sign-In.
  Verificado en vivo: Google provider habilitado, SQL corrido, login
  probado por el usuario en localhost.
- F2: `generateLabeledEvents` (52 eventos sintéticos, semilla fija=42,
  4 categorías) + `useLiveTelemetry` (GPS/DeviceMotion reales con
  fallback automático al simulador). Vista de debug en `/rider/debug`
  etiqueta cada fila como "Dato simulado" o "Sensor real".
- F3: motor de fusión por reglas (`lib/fusion/engine.ts`) — combina
  caída de velocidad GPS + pico de aceleración. Medido contra los 52
  eventos de F2: **umbral ingenuo 74.4% falsos positivos (29/39),
  motor de fusión 15.4% (6/39)**. Número real, no "resuelto". 100% de
  recall en `frenado_real` (ninguna caída real se pierde).
- F4: tablas `sos_events` y `sensor_sessions`, aisladas por diseño de
  cualquier tabla de asignación de pedidos o calificación (no existen
  esas tablas en este proyecto, y no se planea agregarlas). SOS manual
  activa de inmediato; SOS automático (fusión alta-confianza) abre
  ventana de 15s. Cancelar registra falso positivo, no borra la fila.
  Toggle de "conectividad limitada" simula el fallback SMS (SMS real no
  implementado, según alcance).
- F5: `/dashboard` público, sin auth, lee la vista
  `dashboard_public_metrics` (agregada, sin `rider_id`) — nunca filtra
  datos crudos del lado del cliente.
- F6: sección de límites de validación embebida en `/dashboard`
  (`#confianza`), enlazada desde `/rider`. Los umbrales citados
  (caída de velocidad ≥15 km/h) coinciden con las constantes reales de
  `lib/fusion/engine.ts` — no son un número inventado para el texto.

### Test plan ejecutado

1. **Pase mecánico (50+ eventos etiquetados):** hecho en F3, ver
   `lib/fusion/engine.test.ts`. Resultado real: 74.4% → 15.4% FP.
2. **RLS vía API directa (sin sesión):** verificado con curl contra
   `riders`, `sos_events`, `sensor_sessions` usando solo la
   publishable key (sin JWT de usuario) — las tres devuelven `[]`,
   nunca datos ni error. `dashboard_public_metrics` sí responde, y
   solo con campos agregados (sin `rider_id`). **Pendiente:** una
   verificación completa con dos usuarios autenticados distintos
   requiere dos sesiones reales de Google — no se pudo automatizar sin
   credenciales del usuario. El mecanismo (`auth.uid() = rider_id`) es
   el mismo para cualquier UID, así que la prueba anon es evidencia
   fuerte pero no un reemplazo total de esa prueba manual.
3. **Bug real encontrado y arreglado:** condición de carrera en el
   flujo SOS automático — `pendingAlert` (estado de React) solo se
   actualiza cuando `createSosEvent` resuelve; un segundo evento de
   alta confianza llegando antes de esa respuesta podía crear una
   alerta SOS duplicada. Se agregó un lock síncrono (`useRef`) en
   `app/rider/RiderScreen.tsx`. Build/lint/tests verificados después
   del fix.
4. **Persona test (Ángel):** caminado en código/flujo (no capturas de
   pantalla reales, sin navegador disponible en esta sesión). Punto de
   confusión más serio encontrado: nada en pantalla indicaba que el
   botón SOS funciona aunque el sensor esté apagado — relevante para
   Ángel, que abandona cosas ambiguas. Se agregó una línea de
   refuerzo junto al botón SOS. Los otros dos puntos del flujo
   (activar sensor, entender "confianza: Media") no mostraron fricción
   grave.

### Qué falta para la próxima sesión

- Correr `docs/COMBINED_MIGRATION.sql` ya se hizo (confirmado por el
  usuario) — no pendiente.
- Verificación manual de RLS con una segunda cuenta de Google real
  (ver punto 2 arriba).
- Persona test con capturas de pantalla reales en un navegador (esta
  sesión lo caminó por código, no visualmente).
- Deploy #2 a Vercel — pendiente al cierre de esta sesión, se hace
  inmediatamente después de este commit.
- Considerar: mapa real (Leaflet/OpenStreetMap) en vez del placeholder
  de "ubicación en vivo" del mockup — no se implementó, no bloqueaba
  ningún acceptance criteria de F1–F6.
