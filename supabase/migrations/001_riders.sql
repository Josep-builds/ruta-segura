-- F1: security floor — riders table, RLS on from the first schema.
-- A rider can only ever read/write their own row: auth.uid() = rider_id.

create table if not exists riders (
  rider_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table riders enable row level security;

create policy "riders_select_own"
  on riders for select
  using (auth.uid() = rider_id);

create policy "riders_insert_own"
  on riders for insert
  with check (auth.uid() = rider_id);

create policy "riders_update_own"
  on riders for update
  using (auth.uid() = rider_id)
  with check (auth.uid() = rider_id);

-- No delete policy: riders cannot delete their own row from the client.
