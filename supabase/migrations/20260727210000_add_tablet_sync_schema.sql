-- ST-API-01: Add Tablet Sync Server Tables
--
-- Additive schema for the staff tablet offline sync pipeline: device
-- registry, sync batch envelopes, per-record sync outcomes, and conflict
-- tracking. Raw request/response payloads are retained on every batch and
-- record row for audit/replay. Existing rental_transactions,
-- bike_status_events, bike_ride_history, and customer app tables are not
-- touched.

create table if not exists public.tablet_devices (
  id uuid primary key default extensions.gen_random_uuid(),
  device_identifier text not null unique,
  device_name text,
  station_id uuid references public.stations (id) on delete set null,
  registered_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  device_status text not null default 'active'
    check (device_status in ('active', 'disabled', 'lost')),
  app_version text,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists tablet_devices_station_id_idx
  on public.tablet_devices (station_id);

create index if not exists tablet_devices_device_status_idx
  on public.tablet_devices (device_status);

create table if not exists public.tablet_sync_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  client_batch_id uuid not null,
  device_id uuid not null references public.tablet_devices (id) on delete cascade,
  station_id uuid references public.stations (id) on delete set null,
  staff_id uuid references public.staff_profiles (id) on delete set null,
  batch_status text not null default 'received'
    check (batch_status in ('received', 'processing', 'completed', 'failed', 'partial')),
  record_count integer not null default 0 check (record_count >= 0),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  error_summary text,
  received_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (device_id, client_batch_id)
);

create index if not exists tablet_sync_batches_device_id_idx
  on public.tablet_sync_batches (device_id);

create index if not exists tablet_sync_batches_station_id_idx
  on public.tablet_sync_batches (station_id);

create index if not exists tablet_sync_batches_client_batch_id_idx
  on public.tablet_sync_batches (client_batch_id);

create index if not exists tablet_sync_batches_batch_status_idx
  on public.tablet_sync_batches (batch_status);

create table if not exists public.tablet_sync_records (
  id uuid primary key default extensions.gen_random_uuid(),
  sync_batch_id uuid not null references public.tablet_sync_batches (id) on delete cascade,
  local_id text not null,
  record_type text not null
    check (record_type in (
      'rental_start', 'rental_return', 'payment_reference', 'incident_report',
      'bike_check', 'battery_log', 'evidence_file', 'other'
    )),
  business_id text,
  device_id uuid not null references public.tablet_devices (id) on delete cascade,
  station_id uuid references public.stations (id) on delete set null,
  staff_id uuid references public.staff_profiles (id) on delete set null,
  sync_status text not null default 'accepted'
    check (sync_status in ('accepted', 'rejected', 'conflict', 'duplicate')),
  server_entity_table text,
  server_entity_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  rejection_reason text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (device_id, local_id)
);

create index if not exists tablet_sync_records_sync_batch_id_idx
  on public.tablet_sync_records (sync_batch_id);

create index if not exists tablet_sync_records_device_id_idx
  on public.tablet_sync_records (device_id);

create index if not exists tablet_sync_records_station_id_idx
  on public.tablet_sync_records (station_id);

create index if not exists tablet_sync_records_local_id_idx
  on public.tablet_sync_records (local_id);

create index if not exists tablet_sync_records_business_id_idx
  on public.tablet_sync_records (business_id);

create index if not exists tablet_sync_records_sync_status_idx
  on public.tablet_sync_records (sync_status);

create table if not exists public.tablet_sync_conflicts (
  id uuid primary key default extensions.gen_random_uuid(),
  sync_record_id uuid not null references public.tablet_sync_records (id) on delete cascade,
  local_id text not null,
  business_id text,
  device_id uuid references public.tablet_devices (id) on delete set null,
  station_id uuid references public.stations (id) on delete set null,
  staff_id uuid references public.staff_profiles (id) on delete set null,
  conflict_type text not null
    check (conflict_type in (
      'stale_status', 'duplicate_business_id', 'missing_reference',
      'payload_mismatch', 'server_rejected', 'other'
    )),
  conflict_status text not null default 'open'
    check (conflict_status in ('open', 'resolved', 'ignored', 'escalated')),
  local_payload jsonb not null default '{}'::jsonb,
  server_payload jsonb not null default '{}'::jsonb,
  resolution_notes text,
  resolved_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists tablet_sync_conflicts_sync_record_id_idx
  on public.tablet_sync_conflicts (sync_record_id);

create index if not exists tablet_sync_conflicts_local_id_idx
  on public.tablet_sync_conflicts (local_id);

create index if not exists tablet_sync_conflicts_business_id_idx
  on public.tablet_sync_conflicts (business_id);

create index if not exists tablet_sync_conflicts_conflict_status_idx
  on public.tablet_sync_conflicts (conflict_status);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_tablet_devices_updated_at'
      and tgrelid = 'public.tablet_devices'::regclass
  ) then
    create trigger handle_tablet_devices_updated_at
      before update on public.tablet_devices
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_tablet_sync_batches_updated_at'
      and tgrelid = 'public.tablet_sync_batches'::regclass
  ) then
    create trigger handle_tablet_sync_batches_updated_at
      before update on public.tablet_sync_batches
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_tablet_sync_records_updated_at'
      and tgrelid = 'public.tablet_sync_records'::regclass
  ) then
    create trigger handle_tablet_sync_records_updated_at
      before update on public.tablet_sync_records
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_tablet_sync_conflicts_updated_at'
      and tgrelid = 'public.tablet_sync_conflicts'::regclass
  ) then
    create trigger handle_tablet_sync_conflicts_updated_at
      before update on public.tablet_sync_conflicts
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;
end $$;

-- Helper: is the authenticated user an active staff member assigned to the
-- given station (or an admin)? Mirrors the private.is_admin() pattern used
-- across the schema; reused by every tablet_* RLS policy below.
create or replace function private.is_staff_for_station(p_station_id uuid)
returns boolean
set search_path = ''
as $$
  select
    coalesce(
      (select is_admin from public.profiles where id = (select auth.uid())),
      false
    )
    or exists (
      select 1
      from public.staff_profiles sp
      where sp.profile_id = (select auth.uid())
        and sp.status = 'active'
        and (p_station_id is null or sp.station_id = p_station_id)
    );
$$ language sql stable security definer;

revoke all on function private.is_staff_for_station(uuid) from public;
grant execute on function private.is_staff_for_station(uuid) to authenticated;

alter table public.tablet_devices enable row level security;
alter table public.tablet_sync_batches enable row level security;
alter table public.tablet_sync_records enable row level security;
alter table public.tablet_sync_conflicts enable row level security;

drop policy if exists "tablet_devices_select_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_select_station_staff_or_admin"
on public.tablet_devices
for select
to authenticated
using (private.is_staff_for_station(station_id));

drop policy if exists "tablet_devices_insert_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_insert_station_staff_or_admin"
on public.tablet_devices
for insert
to authenticated
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_devices_update_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_update_station_staff_or_admin"
on public.tablet_devices
for update
to authenticated
using (private.is_staff_for_station(station_id))
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_devices_delete_admin" on public.tablet_devices;
create policy "tablet_devices_delete_admin"
on public.tablet_devices
for delete
to authenticated
using (private.is_admin());

drop policy if exists "tablet_sync_batches_select_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_select_station_staff_or_admin"
on public.tablet_sync_batches
for select
to authenticated
using (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_batches_insert_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_insert_station_staff_or_admin"
on public.tablet_sync_batches
for insert
to authenticated
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_batches_update_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_update_station_staff_or_admin"
on public.tablet_sync_batches
for update
to authenticated
using (private.is_staff_for_station(station_id))
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_batches_delete_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_delete_admin"
on public.tablet_sync_batches
for delete
to authenticated
using (private.is_admin());

drop policy if exists "tablet_sync_records_select_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_select_station_staff_or_admin"
on public.tablet_sync_records
for select
to authenticated
using (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_records_insert_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_insert_station_staff_or_admin"
on public.tablet_sync_records
for insert
to authenticated
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_records_update_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_update_station_staff_or_admin"
on public.tablet_sync_records
for update
to authenticated
using (private.is_staff_for_station(station_id))
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_records_delete_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_delete_admin"
on public.tablet_sync_records
for delete
to authenticated
using (private.is_admin());

drop policy if exists "tablet_sync_conflicts_select_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_select_station_staff_or_admin"
on public.tablet_sync_conflicts
for select
to authenticated
using (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_conflicts_insert_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_insert_station_staff_or_admin"
on public.tablet_sync_conflicts
for insert
to authenticated
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_conflicts_update_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_update_station_staff_or_admin"
on public.tablet_sync_conflicts
for update
to authenticated
using (private.is_staff_for_station(station_id))
with check (private.is_staff_for_station(station_id));

drop policy if exists "tablet_sync_conflicts_delete_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_delete_admin"
on public.tablet_sync_conflicts
for delete
to authenticated
using (private.is_admin());
