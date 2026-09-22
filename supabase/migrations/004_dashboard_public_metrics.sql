-- F5: public accountability dashboard (Shadow Clause). A separate,
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
