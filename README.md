# Ruta Segura

Piloto académico de instrumentación de seguridad para repartidores en
motocicleta en Ciudad de México. **No es una app de ride-hailing.** Todos
los datos de riders son simulados y se etiquetan en pantalla como tales.

Ver [`docs/PACKET.md`](docs/PACKET.md) para el problema, el usuario exacto,
la arquitectura y el alcance (qué NO se construye).

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Row Level Security) +
Vercel. Solo capas gratuitas.

## Desarrollo local

```bash
cp .env.local.example .env.local   # llena con tus keys de Supabase
npm install
npm run dev
```

## Seguridad

- Row Level Security activo desde el primer schema (`supabase/migrations/`):
  un rider solo lee/escribe su propia fila.
- Ninguna API key vive en el repo — todo en variables de entorno de Vercel
  / `.env.local` (ignorado por git).
- La tabla de eventos de sensor está aislada de cualquier tabla o endpoint
  de asignación de pedidos o calificación del rider — decisión de diseño
  explícita, no un detalle técnico.
- El dashboard público (`/dashboard`) solo expone agregados, nunca eventos
  identificables de un rider individual.

## Deploy

Vercel, conectado a este repo. Variables de entorno requeridas:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
