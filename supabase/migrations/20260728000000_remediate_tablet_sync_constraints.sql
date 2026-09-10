-- Align the persisted tablet-sync vocabularies with @glide/shared without
-- rewriting the already-applied ST-API-01 migration.

-- Constraint names can differ across deployments. Match only the known
-- vocabulary CHECK (by canonical name or legacy labels), never unrelated
-- single- or multi-column business constraints.
do $constraint_drop$
declare
  target_attnum smallint;
  target_constraint record;
  dropped_count integer := 0;
begin
  select attribute.attnum
  into strict target_attnum
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.tablet_sync_records'::regclass
    and attribute.attname = 'record_type'
    and not attribute.attisdropped;

  for target_constraint in
    select constraint_record.conname
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.tablet_sync_records'::regclass
      and constraint_record.contype = 'c'
      and constraint_record.conkey = array[target_attnum]
      and (
        constraint_record.conname = 'tablet_sync_records_record_type_check'
        or (
          pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%incident_report%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%evidence_file%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%other%'
        )
      )
  loop
    execute format(
      'alter table public.tablet_sync_records drop constraint %I',
      target_constraint.conname
    );
    dropped_count := dropped_count + 1;
  end loop;

  if dropped_count <> 1 then
    raise exception 'Expected exactly one record_type vocabulary constraint, found %',
      dropped_count;
  end if;
end;
$constraint_drop$;

-- This is the only legacy value with an unambiguous canonical equivalent.
update public.tablet_sync_records
set record_type = 'incident'
where record_type = 'incident_report';

do $record_type_preflight$
declare
  invalid_values text;
begin
  select string_agg(distinct record_type, ', ' order by record_type)
  into invalid_values
  from public.tablet_sync_records
  where record_type not in (
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
  );

  if invalid_values is not null then
    raise exception
      'Unsupported tablet_sync_records.record_type values require manual remediation: %',
      invalid_values;
  end if;
end;
$record_type_preflight$;

alter table public.tablet_sync_records
  add constraint tablet_sync_records_record_type_check
  check (record_type in (
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
  )) not valid;

alter table public.tablet_sync_records
  validate constraint tablet_sync_records_record_type_check;

do $constraint_drop$
declare
  target_attnum smallint;
  target_constraint record;
  dropped_count integer := 0;
begin
  select attribute.attnum
  into strict target_attnum
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.tablet_sync_conflicts'::regclass
    and attribute.attname = 'conflict_type'
    and not attribute.attisdropped;

  for target_constraint in
    select constraint_record.conname
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.tablet_sync_conflicts'::regclass
      and constraint_record.contype = 'c'
      and constraint_record.conkey = array[target_attnum]
      and (
        constraint_record.conname = 'tablet_sync_conflicts_conflict_type_check'
        or (
          pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%stale_status%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%server_rejected%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%other%'
        )
      )
  loop
    execute format(
      'alter table public.tablet_sync_conflicts drop constraint %I',
      target_constraint.conname
    );
    dropped_count := dropped_count + 1;
  end loop;

  if dropped_count <> 1 then
    raise exception 'Expected exactly one conflict_type vocabulary constraint, found %',
      dropped_count;
  end if;
end;
$constraint_drop$;

do $conflict_type_preflight$
declare
  invalid_values text;
begin
  select string_agg(distinct conflict_type, ', ' order by conflict_type)
  into invalid_values
  from public.tablet_sync_conflicts
  where conflict_type not in (
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
  );

  if invalid_values is not null then
    raise exception
      'Unsupported tablet_sync_conflicts.conflict_type values require manual remediation: %',
      invalid_values;
  end if;
end;
$conflict_type_preflight$;

alter table public.tablet_sync_conflicts
  add constraint tablet_sync_conflicts_conflict_type_check
  check (conflict_type in (
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
  )) not valid;

alter table public.tablet_sync_conflicts
  validate constraint tablet_sync_conflicts_conflict_type_check;

do $constraint_drop$
declare
  target_attnum smallint;
  target_constraint record;
  dropped_count integer := 0;
begin
  select attribute.attnum
  into strict target_attnum
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.tablet_sync_records'::regclass
    and attribute.attname = 'sync_status'
    and not attribute.attisdropped;

  for target_constraint in
    select constraint_record.conname
    from pg_catalog.pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.tablet_sync_records'::regclass
      and constraint_record.contype = 'c'
      and constraint_record.conkey = array[target_attnum]
      and (
        constraint_record.conname = 'tablet_sync_records_sync_status_check'
        or (
          pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%accepted%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%rejected%'
          and pg_catalog.pg_get_constraintdef(constraint_record.oid) like '%duplicate%'
        )
      )
  loop
    execute format(
      'alter table public.tablet_sync_records drop constraint %I',
      target_constraint.conname
    );
    dropped_count := dropped_count + 1;
  end loop;

  if dropped_count <> 1 then
    raise exception 'Expected exactly one sync_status vocabulary constraint, found %',
      dropped_count;
  end if;
end;
$constraint_drop$;

alter table public.tablet_sync_records
  add constraint tablet_sync_records_sync_status_check
  check (sync_status in (
    'accepted',
    'accepted_pending_evidence',
    'rejected',
    'conflict',
    'duplicate'
  )) not valid;

alter table public.tablet_sync_records
  validate constraint tablet_sync_records_sync_status_check;
