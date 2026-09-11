\set ON_ERROR_STOP on

begin;

create schema auth;
create schema private;
create schema extensions;
create role authenticated;

create function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function private.is_admin()
returns boolean
language sql
stable
as $$ select false $$;
create function extensions.moddatetime()
returns trigger
language plpgsql
as $$ begin new.updated_at = now(); return new; end $$;
create function extensions.gen_random_uuid()
returns uuid
language sql
volatile
as $$ select pg_catalog.gen_random_uuid() $$;

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

\ir ../migrations/20260727210000_add_tablet_sync_schema.sql
\ir ../migrations/20260728000000_remediate_tablet_sync_constraints.sql

insert into public.profiles (id, is_admin)
values
  ('00000000-0000-0000-0000-000000000001', false),
  ('00000000-0000-0000-0000-000000000002', false),
  ('00000000-0000-0000-0000-000000000003', false),
  ('00000000-0000-0000-0000-000000000004', false),
  ('00000000-0000-0000-0000-000000000005', true),
  ('00000000-0000-0000-0000-000000000006', false);
insert into public.stations (id)
values
  ('10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002');
insert into public.staff_profiles (id, profile_id, role, station_id, status)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'station_admin', '10000000-0000-0000-0000-000000000001', 'active'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'station_admin', '10000000-0000-0000-0000-000000000002', 'active'),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'operations_manager', null, 'active'),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'station_admin', '10000000-0000-0000-0000-000000000001', 'inactive'),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006', 'mystery_role', '10000000-0000-0000-0000-000000000001', 'active');

insert into public.tablet_devices (
  id, device_identifier, station_id, registered_by_staff_id, device_status
)
values
  ('30000000-0000-0000-0000-000000000001', 'active-a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'active'),
  ('30000000-0000-0000-0000-000000000002', 'active-b', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'active'),
  ('30000000-0000-0000-0000-000000000003', 'disabled-a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'disabled'),
  ('30000000-0000-0000-0000-000000000004', 'lost-a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'lost'),
  ('30000000-0000-0000-0000-000000000005', 'null-station', null, '20000000-0000-0000-0000-000000000001', 'active');
alter table public.tablet_devices drop constraint tablet_devices_device_status_check;
insert into public.tablet_devices (
  id, device_identifier, station_id, registered_by_staff_id, device_status
)
values (
  '30000000-0000-0000-0000-000000000006', 'unknown-a',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', 'unknown'
);
alter table public.tablet_devices
  add constraint tablet_devices_device_status_check
  check (device_status in ('active', 'disabled', 'lost')) not valid;

insert into public.tablet_sync_batches (
  id, client_batch_id, device_id, station_id, staff_id
)
values
  ('40000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002'),
  ('40000000-0000-0000-0000-000000000003', '41000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000004', '41000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('40000000-0000-0000-0000-000000000005', '41000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', null, '20000000-0000-0000-0000-000000000001');
insert into public.tablet_sync_records (
  id, sync_batch_id, local_id, record_type, device_id, station_id, staff_id
)
values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'record-a', 'rental_start', '30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', 'record-disabled', 'rental_start', '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001');
insert into public.tablet_sync_conflicts (
  id, sync_record_id, local_id, device_id, station_id, staff_id, conflict_type
)
values (
  '60000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001', 'conflict-a',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001', 'bike_status_changed'
);

\ir ../migrations/20260728130000_harden_tablet_sync_rls.sql

grant usage on schema public, private to authenticated;
grant select, insert, update, delete on
  public.tablet_devices,
  public.tablet_sync_batches,
  public.tablet_sync_records,
  public.tablet_sync_conflicts
to authenticated;

select no_plan();
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

select is((select count(*) from public.tablet_devices), 1::bigint,
  'ordinary active staff sees only the active device at their station');
select is((select count(*) from public.tablet_sync_batches), 1::bigint,
  'ordinary active staff sees only their valid active-device batch');
select is((select count(*) from public.tablet_sync_records), 1::bigint,
  'sync rows backed by disabled devices are hidden');
select is((select count(*) from public.tablet_sync_conflicts), 1::bigint,
  'ordinary active staff sees an exact conflict tuple');

select lives_ok(
  $$insert into public.tablet_sync_batches (
      id, client_batch_id, device_id, station_id, staff_id
    ) values (
      '40000000-0000-0000-0000-000000000011',
      '41000000-0000-0000-0000-000000000011',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  'ordinary staff can insert an exact active-device batch tuple'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000012',
      '30000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  '42501', null, 'device/station mismatch is rejected'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000013',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002'
    )$$,
  '42501', null, 'staff attribution spoofing is rejected'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000014',
      '30000000-0000-0000-0000-000000000003',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  '42501', null, 'disabled device is rejected'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000015',
      '30000000-0000-0000-0000-000000000006',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  '42501', null, 'unknown device status is rejected'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000016',
      '30000000-0000-0000-0000-000000000005', null,
      '20000000-0000-0000-0000-000000000001'
    )$$,
  '42501', null, 'NULL station tuple fails closed'
);

select lives_ok(
  $$insert into public.tablet_sync_records (
      id, sync_batch_id, local_id, record_type, device_id, station_id, staff_id
    ) values (
      '50000000-0000-0000-0000-000000000011',
      '40000000-0000-0000-0000-000000000011', 'record-valid', 'rental_start',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  'record insert requires and accepts the exact parent batch tuple'
);
select throws_ok(
  $$insert into public.tablet_sync_records (
      sync_batch_id, local_id, record_type, device_id, station_id, staff_id
    ) values (
      '40000000-0000-0000-0000-000000000011', 'record-wrong-device', 'rental_start',
      '30000000-0000-0000-0000-000000000002',
      '10000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000001'
    )$$,
  '42501', null, 'record tuple cannot diverge from its parent batch'
);
select lives_ok(
  $$insert into public.tablet_sync_conflicts (
      id, sync_record_id, local_id, device_id, station_id, staff_id, conflict_type
    ) values (
      '60000000-0000-0000-0000-000000000011',
      '50000000-0000-0000-0000-000000000011', 'conflict-valid',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001', 'bike_status_changed'
    )$$,
  'conflict insert requires and accepts the exact parent record tuple'
);
select throws_ok(
  $$insert into public.tablet_sync_conflicts (
      sync_record_id, local_id, device_id, station_id, staff_id, conflict_type
    ) values (
      '50000000-0000-0000-0000-000000000011', 'conflict-wrong-staff',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002', 'bike_status_changed'
    )$$,
  '42501', null, 'conflict tuple cannot diverge from its parent record'
);
select throws_ok(
  $$update public.tablet_sync_batches
    set station_id = '10000000-0000-0000-0000-000000000002'
    where id = '40000000-0000-0000-0000-000000000011'$$,
  '42501', 'Tablet sync batch identity fields are immutable.',
  'batch identity cannot move on update'
);
select throws_ok(
  $$update public.tablet_sync_records
    set staff_id = '20000000-0000-0000-0000-000000000002'
    where id = '50000000-0000-0000-0000-000000000011'$$,
  '42501', 'Tablet sync record identity fields are immutable.',
  'record staff attribution cannot change on update'
);
select throws_ok(
  $$update public.tablet_sync_conflicts
    set device_id = '30000000-0000-0000-0000-000000000002'
    where id = '60000000-0000-0000-0000-000000000011'$$,
  '42501', 'Tablet sync conflict identity fields are immutable.',
  'conflict device attribution cannot change on update'
);

select lives_ok(
  $$insert into public.tablet_devices (
      id, device_identifier, station_id, registered_by_staff_id, device_status
    ) values (
      '30000000-0000-0000-0000-000000000011', 'new-active-a',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001', 'active'
    )$$,
  'device registration is bound to current active staff'
);
select throws_ok(
  $$insert into public.tablet_devices (
      device_identifier, station_id, registered_by_staff_id, device_status
    ) values (
      'spoofed-registrar', '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002', 'active'
    )$$,
  '42501', null, 'device registrar spoofing is rejected'
);
select throws_ok(
  $$update public.tablet_devices
    set station_id = '10000000-0000-0000-0000-000000000002'
    where id = '30000000-0000-0000-0000-000000000011'$$,
  '42501', 'Tablet device identity fields are immutable.',
  'device identity cannot move on update'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.tablet_devices), 3::bigint,
  'active manager staff can access active devices across stations');
select is((select count(*) from public.tablet_sync_batches), 1::bigint,
  'manager sees only their own valid active-device tuple across stations');
select lives_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id, station_id, staff_id
    ) values (
      '41000000-0000-0000-0000-000000000021',
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000003'
    )$$,
  'manager can write their own exact tuple across stations'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.tablet_devices), 0::bigint,
  'inactive staff has no tablet access');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.tablet_devices), 0::bigint,
  'profile is_admin without active staff has no tablet access');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
select is((select count(*) from public.tablet_devices), 2::bigint,
  'unknown active role has only ordinary same-station access');

reset role;
select is(
  (select count(*) from pg_catalog.pg_proc as procedure
   where procedure.pronamespace = 'private'::regnamespace
     and procedure.proname in (
       'is_cross_station_tablet_staff',
       'is_staff_for_station',
       'is_current_tablet_staff',
       'is_optional_current_tablet_staff',
       'is_active_tablet_device_for_station',
       'is_valid_tablet_batch_tuple',
       'is_valid_tablet_conflict_tuple'
     )
     and procedure.prosecdef
     and procedure.proconfig = array['search_path=""']),
  7::bigint,
  'all tablet authorization helpers are SECURITY DEFINER with empty search_path'
);
select ok(not has_function_privilege('public',
  'private.is_staff_for_station(uuid)', 'execute'),
  'PUBLIC cannot execute station authorization helper');
select is(
  (select count(*) from pg_catalog.pg_trigger
   where tgrelid in (
     'public.tablet_devices'::regclass,
     'public.tablet_sync_batches'::regclass,
     'public.tablet_sync_records'::regclass,
     'public.tablet_sync_conflicts'::regclass
   )
     and tgname like 'enforce_tablet_%_identity_immutability'
     and not tgisinternal),
  4::bigint,
  'all four tablet tables enforce immutable identity tuples'
);

select * from finish();
rollback;
