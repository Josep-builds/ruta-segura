-- F4: SOS events. Isolated by design — no foreign key, view, or endpoint
-- ever joins this table to anything resembling order assignment or rider
-- rating. That separation is a deliberate design decision from
-- docs/PACKET.md, not an incidental omission.

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
