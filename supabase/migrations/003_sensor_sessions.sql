-- F4: sensor session heartbeats. One row per rider, updated while the
-- sensor (real or simulated fallback, see lib/telemetry) is on. This is
-- what makes F5's "sensores activos" count real instead of hardcoded —
-- it counts rows with a recent heartbeat, not a made-up number.
-- Isolated from sos_events and from anything order/rating-shaped, same
-- design decision as sos_events.

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
