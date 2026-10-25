-- Harden tablet-sync RLS around active staff, active devices, and immutable
-- station/device/staff identity tuples. Cross-station access is granted only
-- to the same active staff roles used by the web authorization guard.

create or replace function private.is_cross_station_tablet_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_profiles as staff
    where staff.profile_id = auth.uid()
      and staff.status = 'active'
      and staff.role in (
        'admin', 'operations_manager', 'assistant_operations_manager'
      )
  );
$$;

create or replace function private.is_staff_for_station(p_station_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_station_id is not null
    and exists (
      select 1
      from public.staff_profiles as staff
      where staff.profile_id = auth.uid()
        and staff.status = 'active'
        and (
          staff.role in (
            'admin', 'operations_manager', 'assistant_operations_manager'
          )
          or staff.station_id = p_station_id
        )
    );
$$;

create or replace function private.is_current_tablet_staff(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_staff_id is not null
    and exists (
      select 1
      from public.staff_profiles as staff
      where staff.id = p_staff_id
        and staff.profile_id = auth.uid()
        and staff.status = 'active'
    );
$$;

create or replace function private.is_optional_current_tablet_staff(p_staff_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_staff_id is null or private.is_current_tablet_staff(p_staff_id);
$$;

create or replace function private.is_active_tablet_device_for_station(
  p_device_id uuid,
  p_station_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_device_id is not null
    and p_station_id is not null
    and exists (
      select 1
      from public.tablet_devices as device
      where device.id = p_device_id
        and device.device_status = 'active'
        and device.station_id = p_station_id
    );
$$;

create or replace function private.is_valid_tablet_batch_tuple(
  p_batch_id uuid,
  p_device_id uuid,
  p_station_id uuid,
  p_staff_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_batch_id is not null
    and exists (
      select 1
      from public.tablet_sync_batches as batch
      where batch.id = p_batch_id
        and batch.device_id = p_device_id
        and batch.station_id = p_station_id
        and batch.staff_id = p_staff_id
    );
$$;

create or replace function private.is_valid_tablet_conflict_tuple(
  p_record_id uuid,
  p_device_id uuid,
  p_station_id uuid,
  p_staff_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_record_id is not null
    and exists (
      select 1
      from public.tablet_sync_records as record
      where record.id = p_record_id
        and record.device_id = p_device_id
        and record.station_id = p_station_id
        and record.staff_id = p_staff_id
    );
$$;

create or replace function private.enforce_tablet_sync_identity_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'tablet_devices' then
    if new.device_identifier is distinct from old.device_identifier
      or new.station_id is distinct from old.station_id
      or new.registered_by_staff_id is distinct from old.registered_by_staff_id
    then
      raise exception 'Tablet device identity fields are immutable.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'tablet_sync_batches' then
    if new.client_batch_id is distinct from old.client_batch_id
      or new.device_id is distinct from old.device_id
      or new.station_id is distinct from old.station_id
      or new.staff_id is distinct from old.staff_id
    then
      raise exception 'Tablet sync batch identity fields are immutable.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'tablet_sync_records' then
    if new.sync_batch_id is distinct from old.sync_batch_id
      or new.local_id is distinct from old.local_id
      or new.device_id is distinct from old.device_id
      or new.station_id is distinct from old.station_id
      or new.staff_id is distinct from old.staff_id
    then
      raise exception 'Tablet sync record identity fields are immutable.'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'tablet_sync_conflicts' then
    if new.sync_record_id is distinct from old.sync_record_id
      or new.local_id is distinct from old.local_id
      or new.device_id is distinct from old.device_id
      or new.station_id is distinct from old.station_id
      or new.staff_id is distinct from old.staff_id
    then
      raise exception 'Tablet sync conflict identity fields are immutable.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.is_cross_station_tablet_staff() from public;
revoke all on function private.is_staff_for_station(uuid) from public;
revoke all on function private.is_current_tablet_staff(uuid) from public;
revoke all on function private.is_optional_current_tablet_staff(uuid) from public;
revoke all on function private.is_active_tablet_device_for_station(uuid, uuid) from public;
revoke all on function private.is_valid_tablet_batch_tuple(uuid, uuid, uuid, uuid) from public;
revoke all on function private.is_valid_tablet_conflict_tuple(uuid, uuid, uuid, uuid) from public;
revoke all on function private.enforce_tablet_sync_identity_immutability() from public;

grant execute on function private.is_cross_station_tablet_staff() to authenticated;
grant execute on function private.is_staff_for_station(uuid) to authenticated;
grant execute on function private.is_current_tablet_staff(uuid) to authenticated;
grant execute on function private.is_optional_current_tablet_staff(uuid) to authenticated;
grant execute on function private.is_active_tablet_device_for_station(uuid, uuid) to authenticated;
grant execute on function private.is_valid_tablet_batch_tuple(uuid, uuid, uuid, uuid) to authenticated;
grant execute on function private.is_valid_tablet_conflict_tuple(uuid, uuid, uuid, uuid) to authenticated;

create or replace trigger enforce_tablet_device_identity_immutability
before update on public.tablet_devices
for each row execute function private.enforce_tablet_sync_identity_immutability();
create or replace trigger enforce_tablet_sync_batch_identity_immutability
before update on public.tablet_sync_batches
for each row execute function private.enforce_tablet_sync_identity_immutability();
create or replace trigger enforce_tablet_sync_record_identity_immutability
before update on public.tablet_sync_records
for each row execute function private.enforce_tablet_sync_identity_immutability();
create or replace trigger enforce_tablet_sync_conflict_identity_immutability
before update on public.tablet_sync_conflicts
for each row execute function private.enforce_tablet_sync_identity_immutability();

alter table public.tablet_devices enable row level security;
alter table public.tablet_sync_batches enable row level security;
alter table public.tablet_sync_records enable row level security;
alter table public.tablet_sync_conflicts enable row level security;

-- Device registry: active staff may see/manage only a non-NULL authorized
-- station. Registration is bound to the caller; identity fields cannot move.
drop policy if exists "tablet_devices_select_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_select_station_staff_or_admin"
on public.tablet_devices for select to authenticated
using (
  device_status = 'active'
  and private.is_staff_for_station(station_id)
);

drop policy if exists "tablet_devices_insert_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_insert_station_staff_or_admin"
on public.tablet_devices for insert to authenticated
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(registered_by_staff_id)
  and device_status = 'active'
);

drop policy if exists "tablet_devices_update_station_staff_or_admin" on public.tablet_devices;
create policy "tablet_devices_update_station_staff_or_admin"
on public.tablet_devices for update to authenticated
using (
  device_status = 'active'
  and private.is_staff_for_station(station_id)
)
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(registered_by_staff_id)
);

drop policy if exists "tablet_devices_delete_admin" on public.tablet_devices;
create policy "tablet_devices_delete_admin"
on public.tablet_devices for delete to authenticated
using (
  private.is_cross_station_tablet_staff()
  and station_id is not null
  and device_status = 'active'
);

-- Batch rows require an exact active device/station/current-staff tuple.
drop policy if exists "tablet_sync_batches_select_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_select_station_staff_or_admin"
on public.tablet_sync_batches for select to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
);

drop policy if exists "tablet_sync_batches_insert_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_insert_station_staff_or_admin"
on public.tablet_sync_batches for insert to authenticated
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
);

drop policy if exists "tablet_sync_batches_update_station_staff_or_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_update_station_staff_or_admin"
on public.tablet_sync_batches for update to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
)
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
);

drop policy if exists "tablet_sync_batches_delete_admin" on public.tablet_sync_batches;
create policy "tablet_sync_batches_delete_admin"
on public.tablet_sync_batches for delete to authenticated
using (
  private.is_cross_station_tablet_staff()
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
);

-- Record rows must also exactly match their parent batch tuple.
drop policy if exists "tablet_sync_records_select_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_select_station_staff_or_admin"
on public.tablet_sync_records for select to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_batch_tuple(sync_batch_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_records_insert_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_insert_station_staff_or_admin"
on public.tablet_sync_records for insert to authenticated
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_batch_tuple(sync_batch_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_records_update_station_staff_or_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_update_station_staff_or_admin"
on public.tablet_sync_records for update to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_batch_tuple(sync_batch_id, device_id, station_id, staff_id)
)
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_batch_tuple(sync_batch_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_records_delete_admin" on public.tablet_sync_records;
create policy "tablet_sync_records_delete_admin"
on public.tablet_sync_records for delete to authenticated
using (
  private.is_cross_station_tablet_staff()
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_batch_tuple(sync_batch_id, device_id, station_id, staff_id)
);

-- Conflict rows must exactly match their parent record tuple. Resolution may
-- be unassigned or attributed only to the current active staff member.
drop policy if exists "tablet_sync_conflicts_select_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_select_station_staff_or_admin"
on public.tablet_sync_conflicts for select to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_conflict_tuple(sync_record_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_conflicts_insert_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_insert_station_staff_or_admin"
on public.tablet_sync_conflicts for insert to authenticated
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_optional_current_tablet_staff(resolved_by_staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_conflict_tuple(sync_record_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_conflicts_update_station_staff_or_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_update_station_staff_or_admin"
on public.tablet_sync_conflicts for update to authenticated
using (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_conflict_tuple(sync_record_id, device_id, station_id, staff_id)
)
with check (
  private.is_staff_for_station(station_id)
  and private.is_current_tablet_staff(staff_id)
  and private.is_optional_current_tablet_staff(resolved_by_staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_conflict_tuple(sync_record_id, device_id, station_id, staff_id)
);

drop policy if exists "tablet_sync_conflicts_delete_admin" on public.tablet_sync_conflicts;
create policy "tablet_sync_conflicts_delete_admin"
on public.tablet_sync_conflicts for delete to authenticated
using (
  private.is_cross_station_tablet_staff()
  and private.is_current_tablet_staff(staff_id)
  and private.is_active_tablet_device_for_station(device_id, station_id)
  and private.is_valid_tablet_conflict_tuple(sync_record_id, device_id, station_id, staff_id)
);
