-- PROPOSED ONLY — independent review required; same transaction as prelude
-- and exact unchanged 20260727000000 enum replacement.
alter table public.bike_status_events
  alter column from_status set default 'ready_to_rent'::public.bike_status,
  alter column to_status set default 'ready_to_rent'::public.bike_status;
