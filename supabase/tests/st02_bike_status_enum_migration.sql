\set ON_ERROR_STOP on

begin;

create schema auth;
create schema private;
create schema extensions;
create role authenticated;
create role anon;
create role integration_service;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create table public.profiles (
  id uuid primary key,
  is_admin boolean not null default false
);

create type public.bike_status as enum (
  'available',
  'reserved',
  'in_use',
  'maintenance'
);

\if :{?nine_labels}
\else
  \set nine_labels false
\endif

\if :nine_labels
alter type public.bike_status add value 'ready_to_rent';
alter type public.bike_status add value 'returned_pending_inspection';
alter type public.bike_status add value 'charging';
alter type public.bike_status add value 'maintenance_required';
alter type public.bike_status add value 'out_of_service';
\endif

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
grant execute on function public.update_bike_status_with_event(
  text, uuid, public.bike_status, public.bike_status, timestamptz, text,
  jsonb, uuid, uuid, timestamptz, text
) to integration_service with grant option;

insert into public.profiles (id, is_admin)
values
  ('00000000-0000-0000-0000-000000000001', true),
  ('00000000-0000-0000-0000-000000000002', false);

insert into public.bikes (
  id, model, estimated_range_km, top_speed_kmh, pricing_label, status,
  location, latitude, longitude, active_rider_id
)
values
  ('available-bike', 'test', 10, 25, 'test', 'available', 'A', 0, 0, null),
  ('reserved-bike', 'test', 10, 25, 'test', 'reserved', 'B', 0, 0,
    '00000000-0000-0000-0000-000000000002'),
  ('in-use-bike', 'test', 10, 25, 'test', 'in_use', 'C', 0, 0,
    '00000000-0000-0000-0000-000000000002'),
  ('maintenance-bike', 'test', 10, 25, 'test', 'maintenance', 'D', 0, 0, null);

insert into public.bike_status_events (
  id, bike_id, actor_id, from_status, to_status, transition_kind, context,
  created_at
)
values
  ('10000000-0000-0000-0000-000000000001', 'available-bike',
    '00000000-0000-0000-0000-000000000001', 'maintenance', 'available',
    'repair_complete', '{"preserve": true}', '2026-01-01T00:00:00Z'),
  ('10000000-0000-0000-0000-000000000002', 'maintenance-bike',
    '00000000-0000-0000-0000-000000000001', 'available', 'maintenance',
    'repair_start', '{"preserve": true}', '2026-01-02T00:00:00Z');

create temporary table event_snapshot as
select id, bike_id, actor_id, transition_kind, context, created_at
from public.bike_status_events;

create temporary table bike_snapshot as
select
  id,
  model,
  estimated_range_km,
  top_speed_kmh,
  pricing_label,
  location,
  latitude,
  longitude,
  last_reported_at,
  active_rider_id,
  active_ride_started_at,
  active_ride_start_location,
  created_at,
  updated_at
from public.bikes;

create temporary table acl_snapshot as
select
  case when expanded.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
  expanded.is_grantable
from pg_catalog.pg_proc as procedure
cross join lateral pg_catalog.aclexplode(
  coalesce(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))
) as expanded
left join pg_catalog.pg_roles as grantee on grantee.oid = expanded.grantee
where procedure.oid = 'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamp with time zone,text,jsonb,uuid,uuid,timestamp with time zone,text)'::regprocedure
  and expanded.privilege_type = 'EXECUTE';

\ir ../migrations/20260727000000_expand_bike_status_model.sql

select plan(25);

select is(
  (
    select array_agg(e.enumlabel::text order by e.enumsortorder)
    from pg_catalog.pg_enum as e
    join pg_catalog.pg_type as t on t.oid = e.enumtypid
    join pg_catalog.pg_namespace as n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'bike_status'
  ),
  array[
    'ready_to_rent', 'reserved', 'in_use', 'returned_pending_inspection',
    'charging', 'maintenance_required', 'out_of_service'
  ]::text[],
  'bike_status has exactly the canonical seven labels in order'
);
select is(to_regtype('public.bike_status_legacy'), null::regtype,
  'legacy enum type is removed');
select is((select status::text from public.bikes where id = 'available-bike'),
  'ready_to_rent', 'available bike is mapped');
select is((select status::text from public.bikes where id = 'maintenance-bike'),
  'maintenance_required', 'maintenance bike is mapped');
select is((select status::text from public.bikes where id = 'reserved-bike'),
  'reserved', 'reserved bike is preserved');
select is((select status::text from public.bikes where id = 'in-use-bike'),
  'in_use', 'in-use bike is preserved');
select is((select from_status::text from public.bike_status_events where id =
  '10000000-0000-0000-0000-000000000001'), 'maintenance_required',
  'event from_status is mapped');
select is((select to_status::text from public.bike_status_events where id =
  '10000000-0000-0000-0000-000000000001'), 'ready_to_rent',
  'event to_status is mapped');
select is((select from_status::text from public.bike_status_events where id =
  '10000000-0000-0000-0000-000000000002'), 'ready_to_rent',
  'inverse event from_status is mapped');
select is((select to_status::text from public.bike_status_events where id =
  '10000000-0000-0000-0000-000000000002'), 'maintenance_required',
  'inverse event to_status is mapped');
select is((select count(*) from public.bikes), 4::bigint,
  'bike row count is preserved');
select is((select count(*) from public.bike_status_events), 2::bigint,
  'event row count is preserved');
select is(
  (
    select count(*)
    from event_snapshot as before
    join public.bike_status_events as after using (id)
    where before.bike_id = after.bike_id
      and before.actor_id = after.actor_id
      and before.transition_kind = after.transition_kind
      and before.context = after.context
      and before.created_at = after.created_at
  ),
  2::bigint,
  'event identity and immutable audit fields are preserved'
);
select is(
  (
    select count(*)
    from bike_snapshot as before
    join public.bikes as after using (id)
    where before.model = after.model
      and before.estimated_range_km = after.estimated_range_km
      and before.top_speed_kmh = after.top_speed_kmh
      and before.pricing_label = after.pricing_label
      and before.location = after.location
      and before.latitude = after.latitude
      and before.longitude = after.longitude
      and before.last_reported_at = after.last_reported_at
      and before.active_rider_id is not distinct from after.active_rider_id
      and before.active_ride_started_at is not distinct from after.active_ride_started_at
      and before.active_ride_start_location is not distinct from after.active_ride_start_location
      and before.created_at = after.created_at
      and before.updated_at = after.updated_at
  ),
  4::bigint,
  'bike identity and non-status data are preserved'
);
select is(
  (select pg_get_expr(d.adbin, d.adrelid)
   from pg_catalog.pg_attrdef as d
   join pg_catalog.pg_attribute as a
     on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid = 'public.bikes'::regclass and a.attname = 'status'),
  '''ready_to_rent''::bike_status',
  'bike status default is restored'
);
select col_type_is('public', 'bikes', 'status', 'public.bike_status',
  'bikes.status uses the replacement enum');
select col_type_is('public', 'bike_status_events', 'from_status',
  'public.bike_status', 'events.from_status uses the replacement enum');
select col_type_is('public', 'bike_status_events', 'to_status',
  'public.bike_status', 'events.to_status uses the replacement enum');
select col_not_null('public', 'bikes', 'status', 'bikes.status stays not null');
select col_not_null('public', 'bike_status_events', 'from_status',
  'events.from_status stays not null');
select col_not_null('public', 'bike_status_events', 'to_status',
  'events.to_status stays not null');
select ok(has_function_privilege('authenticated',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute'), 'authenticated retains RPC execute privilege');
select ok(not has_function_privilege('anon',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute'), 'anon cannot execute the RPC');
select ok(has_function_privilege('integration_service',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute with grant option'), 'existing non-default grant option is preserved');
select results_eq(
  'select grantee, is_grantable from acl_snapshot order by grantee',
  $$
    select
      case when expanded.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
      expanded.is_grantable
    from pg_catalog.pg_proc as procedure
    cross join lateral pg_catalog.aclexplode(
      coalesce(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))
    ) as expanded
    left join pg_catalog.pg_roles as grantee on grantee.oid = expanded.grantee
    where procedure.oid = 'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamp with time zone,text,jsonb,uuid,uuid,timestamp with time zone,text)'::regprocedure
      and expanded.privilege_type = 'EXECUTE'
    order by grantee
  $$,
  'the complete execute ACL is preserved'
);

select * from finish();
rollback;
