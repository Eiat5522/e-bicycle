\set ON_ERROR_STOP on

begin;

create schema auth;
create schema private;
create schema extensions;
create schema test_support;
create role authenticated;
create role anon;
create role service_role;

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
create table public.stations (id uuid primary key);
create table public.staff_profiles (
  id uuid primary key,
  profile_id uuid not null unique references public.profiles (id),
  role text not null,
  station_id uuid references public.stations (id),
  status text not null
);
create type public.bike_status as enum (
  'ready_to_rent',
  'reserved',
  'in_use',
  'returned_pending_inspection',
  'charging',
  'maintenance_required',
  'out_of_service'
);
create table public.bikes (
  id text primary key,
  model text not null,
  estimated_range_km double precision not null,
  top_speed_kmh integer not null,
  pricing_label text not null,
  status public.bike_status not null default 'ready_to_rent',
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  last_reported_at timestamptz not null default now(),
  active_rider_id uuid references public.profiles (id) on delete set null,
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

insert into public.profiles (id, is_admin)
values
  ('00000000-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000002', false),
  ('00000000-0000-0000-0000-000000000003', false),
  ('00000000-0000-0000-0000-000000000004', false),
  ('00000000-0000-0000-0000-000000000005', false),
  ('00000000-0000-0000-0000-000000000006', false),
  ('00000000-0000-0000-0000-000000000007', false),
  ('00000000-0000-0000-0000-000000000008', true),
  ('00000000-0000-0000-0000-000000000009', false);
insert into public.stations (id)
values ('10000000-0000-0000-0000-000000000001');
insert into public.staff_profiles (id, profile_id, role, station_id, status)
values
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'station_admin', '10000000-0000-0000-0000-000000000001', 'active'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'technician', '10000000-0000-0000-0000-000000000001', 'active'),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'operations_manager', '10000000-0000-0000-0000-000000000001', 'active'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'station_admin', '10000000-0000-0000-0000-000000000001', 'inactive'),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007', 'mystery_role', '10000000-0000-0000-0000-000000000001', 'active');
insert into public.bikes (
  id, model, estimated_range_km, top_speed_kmh, pricing_label,
  status, location, latitude, longitude
)
values ('policy-bike', 'test', 10, 25, 'test', 'ready_to_rent', 'Station A', 0, 0);

\ir ../migrations/20260728120000_enforce_bike_status_rpc_policy.sql

create function test_support.actor_id(p_actor text)
returns uuid
language sql
immutable
as $$
  select case p_actor
    when 'rider' then '00000000-0000-0000-0000-000000000001'::uuid
    when 'staff' then '00000000-0000-0000-0000-000000000003'::uuid
    when 'technician' then '00000000-0000-0000-0000-000000000004'::uuid
    when 'manager' then '00000000-0000-0000-0000-000000000005'::uuid
    when 'sync' then '00000000-0000-0000-0000-000000000009'::uuid
  end;
$$;

create function test_support.exercise_transition(
  p_actor text,
  p_from public.bike_status,
  p_to public.bike_status,
  p_transition_kind text
)
returns void
language plpgsql
as $$
declare
  v_actor_id uuid := test_support.actor_id(p_actor);
  v_existing_rider uuid := case
    when p_from in ('reserved', 'in_use') then
      '00000000-0000-0000-0000-000000000001'::uuid
    else null
  end;
  v_next_rider uuid := case
    when p_to in ('reserved', 'in_use') then v_actor_id
    else null
  end;
  v_next_started timestamptz := case
    when p_to = 'in_use' then '2026-01-02T00:00:00Z'::timestamptz
    else null
  end;
  v_next_location text := case when p_to = 'in_use' then 'Station A' else null end;
begin
  perform set_config(
    'request.jwt.claim.sub',
    case when p_actor = 'sync' then '' else v_actor_id::text end,
    true
  );
  perform set_config(
    'request.jwt.claim.role',
    case when p_actor = 'sync' then 'service_role' else 'authenticated' end,
    true
  );
  delete from public.bike_status_events where bike_id = 'policy-bike';
  update public.bikes
  set
    status = p_from,
    active_rider_id = v_existing_rider,
    active_ride_started_at = case
      when p_from = 'in_use' then '2026-01-01T00:00:00Z'::timestamptz
      else null::timestamptz
    end,
    active_ride_start_location = case when p_from = 'in_use' then 'Station A' else null end
  where id = 'policy-bike';

  perform public.update_bike_status_with_event(
    'policy-bike', v_actor_id, p_from, p_to, '2026-01-02T00:00:00Z',
    p_transition_kind, jsonb_build_object('case', p_actor || ':' || p_transition_kind),
    v_existing_rider, v_next_rider, v_next_started, v_next_location
  );

  -- Every allowed transition must accept its exact retry after the state changed.
  perform public.update_bike_status_with_event(
    'policy-bike', v_actor_id, p_from, p_to, '2026-01-02T00:00:00Z',
    p_transition_kind, jsonb_build_object('case', p_actor || ':' || p_transition_kind),
    v_existing_rider, v_next_rider, v_next_started, v_next_location
  );
  if (select count(*) from public.bike_status_events where bike_id = 'policy-bike') <> 1 then
    raise exception 'Exact retry duplicated an audit event';
  end if;
end;
$$;

select no_plan();

select lives_ok(
  format(
    'select test_support.exercise_transition(%L, %L::public.bike_status, %L::public.bike_status, %L)',
    actor, from_status, to_status, transition_kind
  ),
  actor || ' ' || from_status || ' -> ' || to_status || ' via ' || transition_kind
)
from (values
  ('rider', 'ready_to_rent', 'reserved', 'reserve'),
  ('rider', 'ready_to_rent', 'in_use', 'ride_start'),
  ('rider', 'reserved', 'in_use', 'ride_start'),
  ('rider', 'in_use', 'returned_pending_inspection', 'ride_end'),
  ('staff', 'returned_pending_inspection', 'ready_to_rent', 'inspection_clear'),
  ('staff', 'returned_pending_inspection', 'charging', 'charging_start'),
  ('staff', 'ready_to_rent', 'charging', 'charging_start'),
  ('staff', 'returned_pending_inspection', 'maintenance_required', 'maintenance_start'),
  ('staff', 'ready_to_rent', 'maintenance_required', 'maintenance_start'),
  ('staff', 'charging', 'maintenance_required', 'maintenance_start'),
  ('technician', 'charging', 'ready_to_rent', 'charging_complete'),
  ('technician', 'maintenance_required', 'ready_to_rent', 'maintenance_complete'),
  ('manager', 'ready_to_rent', 'out_of_service', 'out_of_service'),
  ('manager', 'reserved', 'out_of_service', 'out_of_service'),
  ('manager', 'returned_pending_inspection', 'out_of_service', 'out_of_service'),
  ('manager', 'charging', 'out_of_service', 'out_of_service'),
  ('manager', 'maintenance_required', 'out_of_service', 'out_of_service'),
  ('manager', 'out_of_service', 'ready_to_rent', 'return_to_service'),
  ('manager', 'maintenance_required', 'ready_to_rent', 'return_to_service'),
  ('sync', 'ready_to_rent', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'reserved', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'in_use', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'returned_pending_inspection', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'charging', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'maintenance_required', 'ready_to_rent', 'sync_reconcile'),
  ('sync', 'out_of_service', 'ready_to_rent', 'sync_reconcile')
) as rule(actor, from_status, to_status, transition_kind);

select throws_ok(
  format(
    'select test_support.exercise_transition(%L, %L::public.bike_status, %L::public.bike_status, %L)',
    actor, from_status, to_status, transition_kind
  ),
  '42501', null,
  actor || ' cannot use another actor class transition'
)
from (values
  ('rider', 'charging', 'ready_to_rent', 'charging_complete'),
  ('staff', 'maintenance_required', 'ready_to_rent', 'maintenance_complete'),
  ('technician', 'ready_to_rent', 'out_of_service', 'out_of_service'),
  ('manager', 'returned_pending_inspection', 'charging', 'charging_start'),
  ('sync', 'ready_to_rent', 'reserved', 'reserve')
) as invalid_rule(actor, from_status, to_status, transition_kind);

select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', true);
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000008', 'ready_to_rent',
    'out_of_service', now(), 'out_of_service', '{}', null, null, null, null
  )$$,
  '42501', null, 'profile is_admin without active staff cannot act as manager'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000006', 'ready_to_rent',
    'charging', now(), 'charging_start', '{}', null, null, null, null
  )$$,
  '42501', null, 'inactive staff is rejected'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000007', true);
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000007', 'ready_to_rent',
    'charging', now(), 'charging_start', '{}', null, null, null, null
  )$$,
  '42501', null, 'unknown active staff role is rejected'
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000002', 'ready_to_rent',
    'reserved', now(), 'reserve', '{}', null,
    '00000000-0000-0000-0000-000000000002', null, null
  )$$,
  '42501', null, 'p_actor_id cannot impersonate another authenticated user'
);

update public.bikes
set status = 'reserved', active_rider_id = '00000000-0000-0000-0000-000000000002',
  active_ride_started_at = null, active_ride_start_location = null
where id = 'policy-bike';
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'reserved',
    'in_use', now(), 'ride_start', '{}',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001', now(), 'Station A'
  )$$,
  '42501', null, 'non-owner rider cannot start another rider reservation'
);
update public.bikes
set status = 'in_use', active_rider_id = '00000000-0000-0000-0000-000000000002',
  active_ride_started_at = now(), active_ride_start_location = 'Station A'
where id = 'policy-bike';
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'in_use',
    'returned_pending_inspection', now(), 'ride_end', '{}',
    '00000000-0000-0000-0000-000000000002', null, null, null
  )$$,
  '42501', null, 'non-owner rider cannot end another rider ride'
);

update public.bikes
set status = 'ready_to_rent', active_rider_id = null,
  active_ride_started_at = null, active_ride_start_location = null
where id = 'policy-bike';
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'reserved',
    'in_use', now(), 'ride_start', '{}', null,
    '00000000-0000-0000-0000-000000000001', now(), 'Station A'
  )$$,
  '40001', null, 'stale expected status is rejected'
);
select throws_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent',
    'in_use', now(), 'ride_start', '{}', null,
    '00000000-0000-0000-0000-000000000001', null, null
  )$$,
  '23514', null, 'in-use transition requires complete ride metadata'
);
select is(
  (select count(*) from public.bike_status_events where bike_id = 'policy-bike'),
  1::bigint,
  'failed transitions do not insert events'
);

-- Successful write preserves caller timestamp/context and supports one-event retry.
delete from public.bike_status_events where bike_id = 'policy-bike';
update public.bikes
set status = 'ready_to_rent', active_rider_id = null,
  active_ride_started_at = null, active_ride_start_location = null
where id = 'policy-bike';
select lives_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent',
    'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}',
    null, '00000000-0000-0000-0000-000000000001', null, null
  )$$,
  'rider reservation succeeds'
);
select is((select last_reported_at from public.bikes where id = 'policy-bike'),
  '2026-02-01T01:02:03Z'::timestamptz, 'caller timestamp is preserved');
select is((select context from public.bike_status_events where bike_id = 'policy-bike'),
  '{"request_id":"retry-1"}'::jsonb, 'caller audit context is preserved');
select lives_ok(
  $$select public.update_bike_status_with_event(
    'policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent',
    'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}',
    null, '00000000-0000-0000-0000-000000000001', null, null
  )$$,
  'matching retry succeeds as an idempotent no-op'
);
select is((select count(*) from public.bike_status_events where bike_id = 'policy-bike'),
  1::bigint, 'matching retry does not duplicate the audit event');

select ok(has_function_privilege('authenticated',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute'), 'authenticated can execute the RPC');
select ok(has_function_privilege('service_role',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute'), 'service role can execute the sync path');
select ok(not has_function_privilege('anon',
  'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamptz,text,jsonb,uuid,uuid,timestamptz,text)',
  'execute'), 'anon cannot execute the RPC');
select is(
  (select array_agg(enumlabel::text order by enumsortorder)
   from pg_catalog.pg_enum
   where enumtypid = 'public.bike_status'::regtype),
  array['ready_to_rent', 'reserved', 'in_use', 'returned_pending_inspection',
    'charging', 'maintenance_required', 'out_of_service']::text[],
  'RPC migration leaves exactly the canonical enum labels'
);

-- Replays must reauthorize and compare the entire original request.
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:04Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '40001', null, 'changed report timestamp is not an exact retry');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', null, null)$q$, '40001', null, 'changed expected rider is not an exact retry');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-2"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '40001', null, 'changed context is not an exact retry');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000002', null, null)$q$, '42501', null, 'retry cannot spoof target owner');
insert into public.staff_profiles(id, profile_id, role, status)
values ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'technician', 'active');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '42501', null, 'role change revokes the original rider transition on retry');
delete from public.staff_profiles where profile_id = '00000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '42501', null, 'another authenticated user cannot replay original actor');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.bike_status_events where bike_id = 'policy-bike'), 1::bigint, 'rejected replays do not append audit events');
select set_config('request.jwt.claim.role', 'service_role', true);
select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000009',
  'reserved', 'ready_to_rent', '2026-02-01T01:02:03Z', 'sync_reconcile', '{}',
  '00000000-0000-0000-0000-000000000001', null, null, null);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '40001', null, 'historical request cannot reexecute after return to original source');
select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"cycle-2"}', null, '00000000-0000-0000-0000-000000000001', null, null);
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"retry-1"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, '40001', null, 'historical request cannot retry after cycle restores target and timestamp');
select lives_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'reserved', '2026-02-01T01:02:03Z', 'reserve', '{"request_id":"cycle-2"}', null, '00000000-0000-0000-0000-000000000001', null, null)$q$, 'latest cycle request remains retryable');
select is((select count(*) from public.bike_status_events where bike_id = 'policy-bike'), 3::bigint, 'cycle retries neither duplicate nor replay historical events');
select ok(not has_table_privilege('authenticated', 'private.bike_status_rpc_receipts', 'INSERT,UPDATE,DELETE'), 'authenticated cannot forge private receipts');

-- Ride-end retry must prove the original owner even after metadata is cleared.
select test_support.exercise_transition('rider', 'in_use', 'returned_pending_inspection', 'ride_end');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'in_use', 'returned_pending_inspection', '2026-01-02T00:00:00Z', 'ride_end', '{"case":"rider:ride_end"}', '00000000-0000-0000-0000-000000000002', null, null, null)$q$, '42501', null, 'ride-end retry cannot spoof original owner after owner was cleared');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'in_use', 'returned_pending_inspection', '2026-01-02T00:00:00Z', 'ride_end', '{"case":"rider:ride_end"}', null, null, null, null)$q$, '40001', null, 'ride-end retry cannot omit original expected owner');
select test_support.exercise_transition('rider', 'ready_to_rent', 'in_use', 'ride_start');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', 'ride_start', '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-03T00:00:00Z', 'Station A')$q$, '40001', null, 'changed ride-start timestamp is not an exact retry');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', 'ride_start', '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-02T00:00:00Z', 'Station B')$q$, '40001', null, 'changed ride-start location is not an exact retry');
set local timezone = 'Asia/Bangkok';
select lives_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', 'ride_start', '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-02T00:00:00Z', 'Station A')$q$, 'exact retry is independent of session timezone');
set local timezone = 'UTC';
update public.bikes set updated_at = updated_at where id = 'policy-bike';
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', 'ride_start', '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-02T00:00:00Z', 'Station A')$q$, '40001', null, 'external bike write invalidates latest receipt even without state change');
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', null, '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-02T00:00:00Z', 'Station A')$q$, '42501', null, 'null action fails closed');

-- Historical audit records alone are insufficient proof of a retry.
select test_support.exercise_transition('rider', 'ready_to_rent', 'in_use', 'ride_start');
delete from private.bike_status_rpc_receipts where bike_id = 'policy-bike';
select throws_ok($q$select public.update_bike_status_with_event('policy-bike', '00000000-0000-0000-0000-000000000001', 'ready_to_rent', 'in_use', '2026-01-02T00:00:00Z', 'ride_start', '{"case":"rider:ride_start"}', null, '00000000-0000-0000-0000-000000000001', '2026-01-02T00:00:00Z', 'Station A')$q$, '40001', null, 'legacy audit event without private receipt cannot authorize retry');

-- SQL NULL and JSON null must retain distinct complete-payload identities.
create function test_support.null_context_retry(p_context jsonb, p_changed jsonb)
returns void language plpgsql as $$
begin
  delete from public.bike_status_events where bike_id = 'policy-bike';
  update public.bikes set status = 'ready_to_rent', active_rider_id = null,
    active_ride_started_at = null, active_ride_start_location = null
  where id = 'policy-bike';
  perform public.update_bike_status_with_event('policy-bike', test_support.actor_id('rider'),
    'ready_to_rent', 'reserved', '2026-03-01Z', 'reserve', p_context,
    null, test_support.actor_id('rider'), null, null);
  perform public.update_bike_status_with_event('policy-bike', test_support.actor_id('rider'),
    'ready_to_rent', 'reserved', '2026-03-01Z', 'reserve', p_context,
    null, test_support.actor_id('rider'), null, null);
  begin
    perform public.update_bike_status_with_event('policy-bike', test_support.actor_id('rider'),
      'ready_to_rent', 'reserved', '2026-03-01Z', 'reserve', p_changed,
      null, test_support.actor_id('rider'), null, null);
    raise exception 'Changed context was accepted as an exact retry';
  exception when serialization_failure then null;
  end;
  if (select count(*) from public.bike_status_events where bike_id = 'policy-bike') <> 1
    or (select context from public.bike_status_events where bike_id = 'policy-bike')
      is distinct from coalesce(p_context, '{}'::jsonb) then
    raise exception 'Retry changed the audit event';
  end if;
end;
$$;
select lives_ok($$select test_support.null_context_retry(null, 'null')$$,
  'SQL NULL context retries exactly but cannot replay as JSON null');
select lives_ok($$select test_support.null_context_retry('null', null)$$,
  'JSON null context retries exactly but cannot replay as SQL NULL');

-- Reproduce the production FK: deleting an owner leaves an orphaned bike.
create function test_support.orphan_transition(p_from public.bike_status)
returns void language plpgsql as $$
begin
  delete from public.bike_status_events where bike_id = 'policy-bike';
  insert into public.profiles(id) values ('00000000-0000-0000-0000-000000000010');
  update public.bikes set status = p_from,
    active_rider_id = '00000000-0000-0000-0000-000000000010',
    active_ride_started_at = case when p_from = 'in_use' then now() end,
    active_ride_start_location = case when p_from = 'in_use' then 'Station A' end
  where id = 'policy-bike';
  delete from public.profiles where id = '00000000-0000-0000-0000-000000000010';
  perform public.update_bike_status_with_event('policy-bike', test_support.actor_id('rider'),
    p_from, case when p_from = 'reserved' then 'in_use'::public.bike_status
      else 'returned_pending_inspection'::public.bike_status end,
    now(), case when p_from = 'reserved' then 'ride_start' else 'ride_end' end, '{}',
    null, case when p_from = 'reserved' then test_support.actor_id('rider') end,
    case when p_from = 'reserved' then now() end,
    case when p_from = 'reserved' then 'Station A' end);
end;
$$;
select throws_ok($$select test_support.orphan_transition('reserved')$$,
  '42501', null, 'deleted reservation owner does not permit rider takeover');
select throws_ok($$select test_support.orphan_transition('in_use')$$,
  '42501', null, 'deleted ride owner does not permit another rider to end ride');

create function test_support.claims_transition(p_claims text, p_legacy_role text,
  p_sync boolean default true)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', p_claims, true);
  perform set_config('request.jwt.claim.role', p_legacy_role, true);
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.bike_status_events where bike_id = 'policy-bike';
  update public.bikes set status = 'ready_to_rent', active_rider_id = null,
    active_ride_started_at = null, active_ride_start_location = null
  where id = 'policy-bike';
  perform public.update_bike_status_with_event('policy-bike',
    test_support.actor_id(case when p_sync then 'sync' else 'rider' end),
    'ready_to_rent', case when p_sync then 'ready_to_rent'::public.bike_status
      else 'reserved'::public.bike_status end,
    '2026-04-01Z', case when p_sync then 'sync_reconcile' else 'reserve' end, '{}',
    null, case when not p_sync then test_support.actor_id('rider') end, null, null);
end;
$$;
select lives_ok($$select test_support.claims_transition('{"role":"service_role"}', '')$$,
  'canonical PostgREST service role claims authorize sync without legacy GUC');
select lives_ok($$select test_support.claims_transition('{"role":"service_role"}', 'authenticated')$$,
  'canonical service role takes precedence over legacy authenticated role');
select lives_ok($$select test_support.claims_transition('{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000001"}', 'service_role', false)$$,
  'canonical rider subject and role override stale legacy service role');
select throws_ok(format('select test_support.claims_transition(%L, %L)', claims, 'service_role'),
  '42501', null, 'canonical claims fail closed rather than fall back: ' || claims)
from (values ('{"role":"authenticated"}'), ('{}'), ('null'), ('[]'),
  ('{"role":null}'), ('{"role":["service_role"]}'), ('not-json')) as invalid(claims);
select set_config('request.jwt.claims', '', true);
select lives_ok($$select test_support.claims_transition('', 'service_role')$$,
  'legacy service role remains supported when canonical claims are absent');

select * from finish();
rollback;
