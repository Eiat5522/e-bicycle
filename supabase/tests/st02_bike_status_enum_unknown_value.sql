\set ON_ERROR_STOP on

create schema auth;
create schema private;
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end;
$$;

create function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;

create table public.profiles (
  id uuid primary key,
  is_admin boolean not null default false
);

create type public.bike_status as enum (
  'available',
  'reserved',
  'in_use',
  'maintenance',
  'mystery_status'
);

create table public.bikes (
  id text primary key,
  model text not null,
  estimated_range_km double precision not null,
  top_speed_kmh integer not null,
  pricing_label text not null,
  status public.bike_status not null default 'available',
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  last_reported_at timestamptz not null default now(),
  active_rider_id uuid references public.profiles (id),
  active_ride_started_at timestamptz,
  active_ride_start_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bike_status_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  bike_id text not null references public.bikes (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  from_status public.bike_status not null,
  to_status public.bike_status not null,
  transition_kind text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function public.update_bike_status_with_event(
  p_bike_id text,
  p_actor_id uuid,
  p_expected_status public.bike_status,
  p_status public.bike_status,
  p_last_reported_at timestamptz,
  p_transition_kind text,
  p_context jsonb,
  p_expected_active_rider_id uuid default null,
  p_active_rider_id uuid default null,
  p_active_ride_started_at timestamptz default null,
  p_active_ride_start_location text default null
)
returns table (id text, status public.bike_status, active_rider_id uuid)
language sql
as $$ select null::text, null::public.bike_status, null::uuid where false $$;

revoke execute on function public.update_bike_status_with_event(
  text, uuid, public.bike_status, public.bike_status, timestamptz, text,
  jsonb, uuid, uuid, timestamptz, text
) from public, anon;
grant execute on function public.update_bike_status_with_event(
  text, uuid, public.bike_status, public.bike_status, timestamptz, text,
  jsonb, uuid, uuid, timestamptz, text
) to authenticated;

insert into public.bikes (
  id, model, estimated_range_km, top_speed_kmh, pricing_label, status,
  location, latitude, longitude
)
values ('unknown-bike', 'test', 10, 25, 'test', 'mystery_status', 'A', 0, 0);

begin;
\set ON_ERROR_STOP off
\ir ../migrations/20260727000000_expand_bike_status_model.sql
\set migration_sqlstate :SQLSTATE
\set ON_ERROR_STOP on
rollback;

begin;
select plan(5);
select isnt(:'migration_sqlstate'::text, '00000'::text,
  'migration fails when an unknown enum label is in use');
select is((select status::text from public.bikes where id = 'unknown-bike'),
  'mystery_status', 'unknown status row is unchanged after rollback');
select ok(to_regtype('public.bike_status') is not null,
  'original bike_status type remains after rollback');
select is(to_regtype('public.bike_status_legacy'), null::regtype,
  'temporary legacy type rename is rolled back');
select ok(to_regprocedure(
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamp with time zone,text,jsonb,uuid,uuid,timestamp with time zone,text)'
) is not null, 'RPC remains after rollback');
select * from finish();
rollback;
