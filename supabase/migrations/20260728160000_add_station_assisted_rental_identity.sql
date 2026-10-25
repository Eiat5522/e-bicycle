-- Canonical station-assisted identity foundation ONLY, not ST-API-05/06 completion.
-- Approved spec: Rider Registration, Rental Start/Return, Server Mapping.
-- rental_transactions requires completion, distance and fare; do not synthesize
-- those fields for an active rental or create an Auth user for a walk-in rider.
-- Intentionally sealed: no RPC or client DML grants until transactional processors
-- validate active staff/device/station, approved notice/configuration, inspection,
-- evidence and exact replay under the bike lock. No policy/TTL/pricing defaults.
-- Ledger/reporting parity remains outstanding: admin/bootstrap/payment/incident/
-- attachment readers must explicitly include this ledger before API05/06 ship.
begin;
create table if not exists public.station_assisted_riders (
  id uuid primary key default extensions.gen_random_uuid(),
  device_id uuid not null references public.tablet_devices(id),
  rider_local_id uuid not null,
  station_id uuid not null references public.stations(id),
  registered_by_staff_id uuid not null references public.staff_profiles(id),
  name text not null check (length(btrim(name)) > 0),
  phone text not null check (length(btrim(phone)) > 0),
  user_type text not null check (user_type in ('local','citizen','tourist','other')),
  email text,
  pdpa_notice_version text not null check (length(btrim(pdpa_notice_version)) > 0),
  pdpa_accepted_at_device timestamptz not null,
  registration_payload jsonb not null check (jsonb_typeof(registration_payload)='object'),
  created_at timestamptz not null default now(),
  unique(device_id,rider_local_id)
);
create table if not exists public.station_assisted_rentals (
  id uuid primary key default extensions.gen_random_uuid(),
  rental_id text not null unique check (length(btrim(rental_id)) > 0),
  rider_id uuid not null references public.station_assisted_riders(id),
  bike_id text not null references public.bikes(id),
  device_id uuid not null references public.tablet_devices(id),
  start_local_id uuid not null,
  start_station_id uuid not null references public.stations(id),
  started_by_staff_id uuid not null references public.staff_profiles(id),
  started_at_device timestamptz not null,
  started_at_server timestamptz not null default now(),
  pdpa_notice_version text not null check (length(btrim(pdpa_notice_version)) > 0),
  rental_notice_version text not null check (length(btrim(rental_notice_version)) > 0),
  start_payload jsonb not null check (jsonb_typeof(start_payload)='object'),
  returned_at_device timestamptz,
  returned_at_server timestamptz,
  return_station_id uuid references public.stations(id),
  returned_by_staff_id uuid references public.staff_profiles(id),
  return_device_id uuid references public.tablet_devices(id),
  return_local_id uuid,
  return_payload jsonb check (jsonb_typeof(return_payload)='object'),
  unique(device_id,start_local_id),
  unique(return_device_id,return_local_id),
  check ((returned_at_server is null and returned_at_device is null and
          return_station_id is null and returned_by_staff_id is null and
          return_device_id is null and return_local_id is null and return_payload is null)
      or (returned_at_server is not null and returned_at_device is not null and
          return_station_id is not null and returned_by_staff_id is not null and
          return_device_id is not null and return_local_id is not null and return_payload is not null)),
  check (returned_at_server is null or returned_at_server >= started_at_server)
);
create unique index if not exists station_assisted_rentals_one_active_bike
  on public.station_assisted_rentals(bike_id) where returned_at_server is null;
alter table public.station_assisted_riders enable row level security;
alter table public.station_assisted_rentals enable row level security;
revoke all on public.station_assisted_riders, public.station_assisted_rentals
  from public, anon, authenticated, service_role;
comment on table public.station_assisted_rentals is
  'Sealed canonical station ledger foundation; no operational write API. No fabricated completed mobile transaction, fare, payment verification or Auth rider. API05/06 processors and reporting parity not implemented.';
commit;
