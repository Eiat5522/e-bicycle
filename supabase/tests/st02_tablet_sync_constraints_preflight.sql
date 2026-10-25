\set ON_ERROR_STOP on

create schema auth;
create schema private;
create schema extensions;
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end;
$$;

create function auth.uid()
returns uuid
language sql
stable
as $$ select null::uuid $$;

create function private.is_admin()
returns boolean
language sql
stable
as $$ select false $$;

create function extensions.moddatetime()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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
  profile_id uuid not null references public.profiles (id),
  role text not null,
  station_id uuid references public.stations (id),
  status text not null
);

\ir ../migrations/20260727210000_add_tablet_sync_schema.sql

alter table public.tablet_sync_records
  add constraint tablet_sync_records_local_business_check
  check (record_type <> 'incident_report' or local_id <> 'forbidden');
alter table public.tablet_sync_conflicts
  add constraint tablet_sync_conflicts_local_business_check
  check (conflict_type <> 'other' or local_id <> 'forbidden');

insert into public.profiles (id)
values ('00000000-0000-0000-0000-000000000001');
insert into public.stations (id)
values ('10000000-0000-0000-0000-000000000001');
insert into public.staff_profiles (id, profile_id, role, station_id, status)
values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'station_admin',
  '10000000-0000-0000-0000-000000000001',
  'active'
);
insert into public.tablet_devices (
  id, device_identifier, station_id, registered_by_staff_id
)
values (
  '30000000-0000-0000-0000-000000000001',
  'device-a',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);
insert into public.tablet_sync_batches (
  id, client_batch_id, device_id, station_id, staff_id
)
values (
  '40000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);
insert into public.tablet_sync_records (
  id, sync_batch_id, local_id, record_type, device_id
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'legacy-incident',
    'incident_report',
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'unsupported-record',
    'other',
    '30000000-0000-0000-0000-000000000001'
  );
insert into public.tablet_sync_conflicts (
  sync_record_id, local_id, conflict_type
)
values (
  '50000000-0000-0000-0000-000000000001',
  'unsupported-conflict',
  'stale_status'
);

begin;
\set ON_ERROR_STOP off
\ir ../migrations/20260728000000_remediate_tablet_sync_constraints.sql
\set record_preflight_sqlstate :SQLSTATE
\set ON_ERROR_STOP on
rollback;

begin;
select plan(4);
select isnt(:'record_preflight_sqlstate'::text, '00000'::text,
  'migration rejects unsupported persisted record values');
select is(
  (select record_type from public.tablet_sync_records where local_id = 'unsupported-record'),
  'other',
  'unsupported record is unchanged after rollback'
);
select is(
  (select record_type from public.tablet_sync_records where local_id = 'legacy-incident'),
  'incident_report',
  'legacy incident conversion is rolled back with failed record preflight'
);
select ok(
  (select pg_catalog.pg_get_constraintdef(oid) like '%incident_report%'
   from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_records'::regclass
     and conname = 'tablet_sync_records_record_type_check'),
  'legacy record vocabulary constraint is restored after rollback'
);
select * from finish();
rollback;

delete from public.tablet_sync_records where local_id = 'unsupported-record';

begin;
\set ON_ERROR_STOP off
\ir ../migrations/20260728000000_remediate_tablet_sync_constraints.sql
\set conflict_preflight_sqlstate :SQLSTATE
\set ON_ERROR_STOP on
rollback;

begin;
select plan(7);
select isnt(:'conflict_preflight_sqlstate'::text, '00000'::text,
  'migration rejects unsupported persisted conflict values');
select is(
  (select conflict_type from public.tablet_sync_conflicts where local_id = 'unsupported-conflict'),
  'stale_status',
  'unsupported conflict is unchanged after rollback'
);
select is(
  (select record_type from public.tablet_sync_records where local_id = 'legacy-incident'),
  'incident_report',
  'legacy incident conversion is rolled back with failed conflict preflight'
);
select ok(
  (select pg_catalog.pg_get_constraintdef(oid) like '%incident_report%'
   from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_records'::regclass
     and conname = 'tablet_sync_records_record_type_check'),
  'legacy record vocabulary constraint remains after conflict rollback'
);
select ok(
  (select pg_catalog.pg_get_constraintdef(oid) like '%stale_status%'
   from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_conflicts'::regclass
     and conname = 'tablet_sync_conflicts_conflict_type_check'),
  'legacy conflict vocabulary constraint is restored after rollback'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.tablet_sync_records'::regclass
      and conname = 'tablet_sync_records_local_business_check'
  ),
  'unrelated record business constraint survives failed migration'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.tablet_sync_conflicts'::regclass
      and conname = 'tablet_sync_conflicts_local_business_check'
  ),
  'unrelated conflict business constraint survives failed migration'
);
select * from finish();
rollback;
