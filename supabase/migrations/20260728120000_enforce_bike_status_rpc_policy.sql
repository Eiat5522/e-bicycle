-- Enforce the shared bike-status actor/action policy at the atomic RPC boundary.
-- The existing RPC signature is retained; p_transition_kind is the stable action
-- discriminator used by every shared transition rule.

create or replace function private.is_valid_bike_status_transition(
  p_actor text,
  p_from_status public.bike_status,
  p_to_status public.bike_status,
  p_transition_kind text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_actor, p_from_status, p_to_status, p_transition_kind) in (
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
  );
$$;

revoke all on function private.is_valid_bike_status_transition(
  text, public.bike_status, public.bike_status, text
) from public;

-- Private receipts retain the complete RPC payload, not caller-controlled audit
-- context. Legacy events have no receipt and therefore cannot prove a retry.
create table private.bike_status_rpc_receipts (
  event_id uuid primary key references public.bike_status_events(id) on delete cascade,
  bike_id text not null references public.bikes(id) on delete cascade,
  payload jsonb not null,
  is_current boolean not null default true
);
create index bike_status_rpc_receipts_bike_idx
  on private.bike_status_rpc_receipts(bike_id);
revoke all on private.bike_status_rpc_receipts from public, anon, authenticated, service_role;

-- Any intervening bike write invalidates the receipt, including writes outside
-- this RPC and cycles that restore exactly the same state and timestamp.
create function private.invalidate_bike_status_rpc_receipts()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update private.bike_status_rpc_receipts
  set is_current = false where bike_id = new.id and is_current;
  return new;
end;
$$;
revoke all on function private.invalidate_bike_status_rpc_receipts()
  from public, anon, authenticated, service_role;
create trigger invalidate_bike_status_rpc_receipts
  after update on public.bikes
  for each row execute function private.invalidate_bike_status_rpc_receipts();

create or replace function public.update_bike_status_with_event(
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
returns table (
  id text,
  status public.bike_status,
  active_rider_id uuid
)
language plpgsql
security definer
set search_path = ''
set timezone = 'UTC'
as $$
declare
  v_user_id uuid;
  v_claims_text text := nullif(current_setting('request.jwt.claims', true), '');
  v_claims jsonb;
  v_is_service_role boolean;
  v_staff public.staff_profiles%rowtype;
  v_actor text;
  v_bike public.bikes%rowtype;
  v_receipt private.bike_status_rpc_receipts%rowtype;
  v_payload jsonb;
  v_event_id uuid;
begin
  -- PostgREST's canonical claims are authoritative as a unit. Never combine
  -- them with stale legacy role/sub GUCs or fall back on invalid claims.
  if v_claims_text is not null then
    begin
      v_claims := v_claims_text::jsonb;
      if jsonb_typeof(v_claims) is distinct from 'object'
        or jsonb_typeof(v_claims -> 'role') is distinct from 'string'
        or (v_claims ->> 'role') not in ('authenticated', 'service_role')
      then
        raise exception 'Invalid request claims.' using errcode = '42501';
      end if;
      v_is_service_role := v_claims ->> 'role' = 'service_role';
      if not v_is_service_role then
        v_user_id := nullif(v_claims ->> 'sub', '')::uuid;
      end if;
    exception when invalid_text_representation then
      raise exception 'Invalid request claims.' using errcode = '42501';
    end;
  else
    v_is_service_role :=
      coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
    if not v_is_service_role then
      v_user_id := auth.uid();
    end if;
  end if;

  if p_actor_id is null then
    raise exception 'An audit actor is required.' using errcode = '42501';
  end if;

  if v_is_service_role then
    v_actor := 'sync';

    if not exists (select 1 from public.profiles where profiles.id = p_actor_id) then
      raise exception 'The sync audit actor does not exist.' using errcode = '42501';
    end if;
  else
    if v_user_id is null or p_actor_id is distinct from v_user_id then
      raise exception 'The audit actor must match the authenticated user.'
        using errcode = '42501';
    end if;

    select staff.*
    into v_staff
    from public.staff_profiles as staff
    where staff.profile_id = v_user_id;

    if found then
      if v_staff.status <> 'active' then
        raise exception 'An active staff profile is required.' using errcode = '42501';
      end if;

      v_actor := case
        when v_staff.role = 'station_admin' then 'staff'
        when v_staff.role = 'technician' then 'technician'
        when v_staff.role in (
          'admin', 'operations_manager', 'assistant_operations_manager'
        ) then 'manager'
        else null
      end;

      if v_actor is null then
        raise exception 'The staff role is not authorized for bike transitions.'
          using errcode = '42501';
      end if;
    else
      v_actor := 'rider';
    end if;
  end if;

  select bike.*
  into v_bike
  from public.bikes as bike
  where bike.id = p_bike_id
  for update;

  if not found then
    raise exception 'Bike not found.' using errcode = 'P0002';
  end if;

  -- Authorization and ownership checks first (idempotent retries still
  -- must prove the current caller is authorized for the original transition).
  if private.is_valid_bike_status_transition(
    v_actor, p_expected_status, p_status, p_transition_kind
  ) is not true then
    raise exception 'Bike status transition is not authorized.' using errcode = '42501';
  end if;

  if v_actor = 'rider' then
    if p_transition_kind in ('reserve', 'ride_start')
      and p_active_rider_id is distinct from v_user_id
    then
      raise exception 'The authenticated rider must own the reservation or ride.'
        using errcode = '42501';
    end if;

    if p_transition_kind in ('ride_start', 'ride_end')
      and (
        (p_expected_active_rider_id is not null
          and p_expected_active_rider_id is distinct from v_user_id)
        or (v_bike.active_rider_id is not null
          and v_bike.active_rider_id is distinct from v_user_id)
      )
    then
      raise exception 'Only the active rider can change this ride.'
        using errcode = '42501';
    end if;
  end if;

  if p_status = 'reserved' then
    if p_active_rider_id is null
      or p_active_ride_started_at is not null
      or p_active_ride_start_location is not null
    then
      raise exception 'Reserved bikes require an owner and no active ride metadata.'
        using errcode = '23514';
    end if;
  elsif p_status = 'in_use' then
    if p_active_rider_id is null
      or p_active_ride_started_at is null
      or p_active_ride_start_location is null
    then
      raise exception 'In-use bikes require rider and ride-start metadata.'
        using errcode = '23514';
    end if;
  elsif p_active_rider_id is not null
    or p_active_ride_started_at is not null
    or p_active_ride_start_location is not null
  then
    raise exception 'Non-riding bike states cannot retain active ride metadata.'
      using errcode = '23514';
  end if;

  -- Full payload identity includes nullable inputs, expected ownership and both
  -- timestamps. A receipt is usable only until the next bike write.
  v_payload := jsonb_build_array(
    p_bike_id, p_actor_id, p_expected_status, p_status, p_last_reported_at,
    -- jsonb_build_array otherwise collapses SQL NULL and JSON null.
    p_transition_kind, p_context, p_context is null, p_expected_active_rider_id,
    p_active_rider_id, p_active_ride_started_at, p_active_ride_start_location
  );
  select receipt.* into v_receipt
  from private.bike_status_rpc_receipts as receipt
  where receipt.bike_id = p_bike_id and receipt.payload = v_payload;

  if found then
    if v_receipt.is_current
      and v_bike.status = p_status
      and v_bike.active_rider_id is not distinct from p_active_rider_id
      and v_bike.active_ride_started_at is not distinct from p_active_ride_started_at
      and v_bike.active_ride_start_location is not distinct from p_active_ride_start_location
      and v_bike.last_reported_at is not distinct from p_last_reported_at
    then
      return query select v_bike.id, v_bike.status, v_bike.active_rider_id;
      return;
    end if;
    raise exception 'Bike state changed. Please retry.' using errcode = '40001';
  end if;

  -- A cleared owner is legitimate only for the proven exact retry above.
  -- ON DELETE SET NULL can orphan reserved/in-use rows; NULL is not ownership.
  if v_actor = 'rider'
    and p_transition_kind in ('ride_start', 'ride_end')
    and v_bike.status in ('reserved', 'in_use')
    and v_bike.active_rider_id is distinct from v_user_id
  then
    raise exception 'Only the active rider can change this ride.'
      using errcode = '42501';
  end if;

  if v_bike.status is distinct from p_expected_status
    or v_bike.active_rider_id is distinct from p_expected_active_rider_id
  then
    raise exception 'Bike state changed. Please retry.' using errcode = '40001';
  end if;

  update public.bikes as bike
  set
    status = p_status,
    active_rider_id = p_active_rider_id,
    active_ride_started_at = p_active_ride_started_at,
    active_ride_start_location = p_active_ride_start_location,
    last_reported_at = p_last_reported_at,
    updated_at = p_last_reported_at
  where bike.id = v_bike.id;

  insert into public.bike_status_events (
    actor_id,
    bike_id,
    context,
    from_status,
    to_status,
    transition_kind
  )
  values (
    p_actor_id,
    v_bike.id,
    coalesce(p_context, '{}'::jsonb),
    v_bike.status,
    p_status,
    p_transition_kind
  ) returning bike_status_events.id into v_event_id;

  insert into private.bike_status_rpc_receipts(event_id, bike_id, payload, is_current)
  values (v_event_id, v_bike.id, v_payload, true);

  return query
  select bike.id, bike.status, bike.active_rider_id
  from public.bikes as bike
  where bike.id = v_bike.id;
end;
$$;

revoke execute on function public.update_bike_status_with_event(
  text, uuid, public.bike_status, public.bike_status, timestamptz, text,
  jsonb, uuid, uuid, timestamptz, text
) from public, anon;
grant execute on function public.update_bike_status_with_event(
  text, uuid, public.bike_status, public.bike_status, timestamptz, text,
  jsonb, uuid, uuid, timestamptz, text
) to authenticated, service_role;