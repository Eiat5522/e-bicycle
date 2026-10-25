\set ON_ERROR_STOP on

begin;

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

create table public.stations (
  id uuid primary key
);

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
  sync_batch_id, local_id, record_type, device_id, station_id, staff_id
)
values (
  '40000000-0000-0000-0000-000000000001',
  'legacy-incident',
  'incident_report',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001'
);

\if :{?apply_recovery}
\else
  \set apply_recovery false
\endif

\if :apply_recovery
  \ir ../migrations/20260728000000_remediate_tablet_sync_constraints.sql
\endif

select plan(43);

select is(
  (select record_type from public.tablet_sync_records where local_id = 'legacy-incident'),
  'incident',
  'persisted incident_report is converted to incident'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.tablet_sync_records'::regclass
      and conname = 'tablet_sync_records_local_business_check'
      and convalidated
  ),
  'unrelated record business constraint is preserved'
);
select ok(
  exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.tablet_sync_conflicts'::regclass
      and conname = 'tablet_sync_conflicts_local_business_check'
      and convalidated
  ),
  'unrelated conflict business constraint is preserved'
);

select ok(
  (select convalidated from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_records'::regclass
     and conname = 'tablet_sync_records_record_type_check'),
  'record_type constraint exists and is validated'
);
select ok(
  (select convalidated from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_conflicts'::regclass
     and conname = 'tablet_sync_conflicts_conflict_type_check'),
  'conflict_type constraint exists and is validated'
);
select ok(
  (select convalidated from pg_catalog.pg_constraint
   where conrelid = 'public.tablet_sync_records'::regclass
     and conname = 'tablet_sync_records_sync_status_check'),
  'sync_status constraint exists and is validated'
);

select lives_ok(
  format(
    $sql$insert into public.tablet_sync_records (
      sync_batch_id, local_id, record_type, device_id, station_id, staff_id
    ) values (
      '40000000-0000-0000-0000-000000000001', %L, %L,
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )$sql$,
    'record-' || record_type,
    record_type
  ),
  record_type || ' record type is accepted'
)
from unnest(array[
  'staff_auth_event',
  'rider_registration',
  'rental_start',
  'rental_return',
  'payment_reference',
  'incident',
  'bike_check',
  'battery_log',
  'manual_override',
  'shift_closeout',
  'evidence_file'
]) as record_type;

select throws_ok(
  format(
    $sql$insert into public.tablet_sync_records (
      sync_batch_id, local_id, record_type, device_id
    ) values (
      '40000000-0000-0000-0000-000000000001', %L, %L,
      '30000000-0000-0000-0000-000000000001'
    )$sql$,
    'invalid-record-' || record_type,
    record_type
  ),
  '23514',
  null,
  record_type || ' legacy/invalid record type is rejected'
)
from unnest(array['incident_report', 'other', 'unknown']) as record_type;

select lives_ok(
  format(
    $sql$insert into public.tablet_sync_conflicts (
      sync_record_id, local_id, device_id, station_id, staff_id, conflict_type
    ) values (
      (select id from public.tablet_sync_records where local_id = 'record-rental_start'),
      %L,
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      %L
    )$sql$,
    'conflict-' || conflict_type,
    conflict_type
  ),
  conflict_type || ' conflict type is accepted'
)
from unnest(array[
  'bike_already_in_use',
  'bike_status_changed',
  'duplicate_rental_id',
  'return_without_active_start',
  'payment_mismatch',
  'missing_required_evidence',
  'station_mismatch',
  'staff_not_authorized',
  'stale_station_snapshot',
  'server_validation_failed'
]) as conflict_type;

select throws_ok(
  format(
    $sql$insert into public.tablet_sync_conflicts (
      sync_record_id, local_id, conflict_type
    ) values (
      (select id from public.tablet_sync_records where local_id = 'record-rental_start'),
      %L,
      %L
    )$sql$,
    'invalid-conflict-' || conflict_type,
    conflict_type
  ),
  '23514',
  null,
  conflict_type || ' legacy/invalid conflict type is rejected'
)
from unnest(array[
  'stale_status',
  'duplicate_business_id',
  'missing_reference',
  'payload_mismatch',
  'server_rejected',
  'other',
  'unknown'
]) as conflict_type;

select lives_ok(
  $$update public.tablet_sync_records
    set sync_status = 'accepted_pending_evidence'
    where local_id = 'record-evidence_file'$$,
  'accepted_pending_evidence sync outcome is accepted'
);
select throws_ok(
  $$update public.tablet_sync_records
    set sync_status = 'unknown'
    where local_id = 'record-evidence_file'$$,
  '23514',
  null,
  'unknown sync outcome is rejected'
);

select throws_ok(
  $$insert into public.tablet_sync_records (
      sync_batch_id, local_id, record_type, device_id
    ) values (
      '40000000-0000-0000-0000-000000000001',
      'record-rental_start',
      'rental_start',
      '30000000-0000-0000-0000-000000000001'
    )$$,
  '23505',
  null,
  'device and local_id idempotency key is unique'
);
select throws_ok(
  $$insert into public.tablet_sync_batches (
      client_batch_id, device_id
    ) values (
      '41000000-0000-0000-0000-000000000001',
      '30000000-0000-0000-0000-000000000001'
    )$$,
  '23505',
  null,
  'device and client_batch_id idempotency key is unique'
);
select throws_ok(
  $$insert into public.tablet_sync_records (
      sync_batch_id, local_id, record_type, device_id
    ) values (
      '40000000-0000-0000-0000-000000000001',
      'invalid-device',
      'rental_start',
      '30000000-0000-0000-0000-000000000099'
    )$$,
  '23503',
  null,
  'device foreign key remains enforced'
);

\if :apply_recovery
  \ir ../migrations/20260728000000_remediate_tablet_sync_constraints.sql
\endif
select pass('recovery migration can be applied a second time');

select * from finish();
rollback;
