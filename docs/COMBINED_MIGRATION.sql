-- Combined migration for Ruta Segura — run once in Supabase → SQL Editor.
-- Concatenates supabase/migrations/002_sos_events.sql,
-- 003_sensor_sessions.sql, and 004_dashboard_public_metrics.sql.
-- 001_riders.sql is not included here — it was already applied.

-- 002_sos_events.sql
-- Isolated by design — no foreign key, view, or endpoint ever joins this
-- table to anything resembling order assignment or rider rating.

create table if not exists sos_events (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references auth.users (id) on delete cascade,
  trigger_type text not null check (trigger_type in ('manual', 'auto')),
  -- confianza del motor de fusión (F3) que originó el evento auto; null en manual.
  source_confidence text check (source_confidence in ('alta', 'media', 'baja')),
  status text not null default 'pendiente_confirmacion'
    check (status in ('pendiente_confirmacion', 'activada', 'cancelada')),
  connectivity_mode text not null default 'normal'
    check (connectivity_mode in ('normal', 'limitada')),
  created_at timestamptz not null default now(),
  -- se llena cuando el rider confirma o cuando la ventana de 15s expira sin respuesta.
  confirmed_at timestamptz,
  -- se llena cuando el rider cancela — el evento se conserva como falso positivo, no se borra.
  cancelled_at timestamptz
);

alter table sos_events enable row level security;

create policy "sos_events_select_own"
  on sos_events for select
  using (auth.uid() = rider_id);

create policy "sos_events_insert_own"
  on sos_events for insert
  with check (auth.uid() = rider_id);

create policy "sos_events_update_own"
  on sos_events for update
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

-- No delete policy: cancelar registra un falso positivo, nunca borra la fila.


-- 003_sensor_sessions.sql
-- One row per rider, updated while the sensor (real or simulated
-- fallback) is on. Makes F5's "sensores activos" count real instead of
-- hardcoded. Isolated from sos_events, same design decision as above.

create table if not exists sensor_sessions (
  rider_id uuid primary key references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  mode text not null default 'simulado' check (mode in ('real', 'simulado'))
);

alter table sensor_sessions enable row level security;

create policy "sensor_sessions_select_own"
  on sensor_sessions for select
  using (auth.uid() = rider_id);

create policy "sensor_sessions_insert_own"
  on sensor_sessions for insert
  with check (auth.uid() = rider_id);

create policy "sensor_sessions_update_own"
  on sensor_sessions for update
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);


-- 004_dashboard_public_metrics.sql
-- Public accountability dashboard (Shadow Clause). A separate,
-- pre-aggregated view — never a client-side filter over raw rows.
-- sos_events and sensor_sessions stay owner-only via RLS; this view is
-- the only thing exposed publicly, and it never returns a rider_id or
-- any per-rider identifiable row.

create or replace view dashboard_public_metrics as
select
  (select count(*) from sensor_sessions
     where last_heartbeat_at > now() - interval '2 minutes') as sensores_activos,
  (select count(*) from sos_events) as alertas_totales,
  (select count(*) from sos_events where status = 'activada') as alertas_activadas,
  (select round(extract(epoch from avg(confirmed_at - created_at)))::int
     from sos_events where confirmed_at is not null) as tiempo_respuesta_prom_seg,
  'Unidad Piloto de Movilidad Segura (simulado)'::text as dueno_institucional,
  now() as ultima_actualizacion;

grant select on dashboard_public_metrics to anon, authenticated;
