-- Expand the fleet lifecycle vocabulary to the canonical MVP states.
-- This migration is additive: it introduces the new enum values, translates
-- existing rows and audit history, and replaces the RPC with canonical status
-- handling for rider and admin workflows.

alter type public.bike_status add value if not exists 'ready_to_rent';
alter type public.bike_status add value if not exists 'returned_pending_inspection';
alter type public.bike_status add value if not exists 'charging';
alter type public.bike_status add value if not exists 'maintenance_required';
alter type public.bike_status add value if not exists 'out_of_service';

update public.bikes
set status = 'ready_to_rent'
where status = 'available';

update public.bikes
set status = 'maintenance_required'
where status = 'maintenance';

update public.bike_status_events
set from_status = 'ready_to_rent'
where from_status = 'available';

update public.bike_status_events
set to_status = 'ready_to_rent'
where to_status = 'available';

update public.bike_status_events
set from_status = 'maintenance_required'
where from_status = 'maintenance';

update public.bike_status_events
set to_status = 'maintenance_required'
where to_status = 'maintenance';

alter table public.bikes
  alter column status set default 'ready_to_rent'::public.bike_status;

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
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_bike public.bikes%rowtype;
  v_reported_at timestamptz := now();
  v_next_active_rider_id uuid;
  v_next_ride_started_at timestamptz;
  v_next_ride_start_location text;
  v_transition_kind text;
begin
  if v_user_id is null or p_actor_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  if p_status is null then
    raise exception 'Bike status is required.' using errcode = '22023';
  end if;

  v_is_admin := exists (
    select 1
    from public.profiles
    where id = v_user_id and is_admin
  );

  if p_actor_id is distinct from v_user_id then
    raise exception 'Unauthorized: actor must match authenticated user'
      using errcode = '42501';
  end if;

  select bike.*
  into v_bike
  from public.bikes as bike
  where bike.id = p_bike_id
  for update;

  if not found then
    raise exception 'Bike not found.' using errcode = 'P0002';
  end if;

  if v_bike.status is distinct from p_expected_status
    or v_bike.active_rider_id is distinct from p_expected_active_rider_id then
    raise exception 'Bike state changed. Please retry.' using errcode = '40001';
  end if;

  if p_status = v_bike.status then
    raise exception 'Bike is already in the requested status.' using errcode = '22023';
  end if;

  if not v_is_admin then
    if p_status = 'in_use' then
      if v_bike.status = 'reserved' and v_bike.active_rider_id is distinct from v_user_id then
        raise exception 'This bike is reserved by another rider.' using errcode = '42501';
      end if;

      if v_bike.status not in ('ready_to_rent', 'reserved') then
        raise exception 'Only ready-to-rent or reserved bikes can start a ride.'
          using errcode = '22023';
      end if;
    elsif p_status = 'returned_pending_inspection' then
      if v_bike.status <> 'in_use' or v_bike.active_rider_id is distinct from v_user_id then
        raise exception 'Only the active rider can end this ride.' using errcode = '42501';
      end if;
    elsif p_status = 'reserved' then
      if v_bike.status <> 'ready_to_rent' then
        raise exception 'Only ready-to-rent bikes can be reserved.' using errcode = '22023';
      end if;
    else
      raise exception 'Only administrators can place bikes into operational hold states.'
        using errcode = '42501';
    end if;
  end if;

  v_next_active_rider_id := case
    when p_status in ('in_use', 'reserved') then p_actor_id
    else null
  end;
  v_next_ride_started_at := case when p_status = 'in_use' then v_reported_at else null end;
  v_next_ride_start_location := case when p_status = 'in_use' then v_bike.location else null end;
  v_transition_kind := case
    when p_status = 'in_use' then 'ride_start'
    when p_status = 'returned_pending_inspection' then 'ride_end'
    when p_status = 'reserved' then 'reserve'
    when p_status = 'charging' then 'charging_start'
    when p_status = 'maintenance_required' then 'maintenance_start'
    when p_status = 'out_of_service' then 'out_of_service'
    when p_status = 'ready_to_rent' and v_bike.status = 'returned_pending_inspection' then 'inspection_clear'
    when p_status = 'ready_to_rent' and v_bike.status = 'charging' then 'charging_complete'
    when p_status = 'ready_to_rent' and v_bike.status = 'maintenance_required' then 'maintenance_complete'
    when p_status = 'ready_to_rent' and v_bike.status = 'out_of_service' then 'return_to_service'
    else 'sync_reconcile'
  end;

  update public.bikes as bike
  set
    status = p_status,
    active_rider_id = v_next_active_rider_id,
    active_ride_started_at = v_next_ride_started_at,
    active_ride_start_location = v_next_ride_start_location,
    last_reported_at = v_reported_at,
    updated_at = v_reported_at
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
    v_user_id,
    v_bike.id,
    jsonb_build_object(
      'active_ride_start_location', v_bike.active_ride_start_location,
      'active_ride_started_at', v_bike.active_ride_started_at,
      'active_rider_id_after', v_next_active_rider_id,
      'active_rider_id_before', v_bike.active_rider_id,
      'bike_location', v_bike.location,
      'requested_status', p_status,
      'source', 'rpc:update_bike_status_with_event'
    ),
    v_bike.status,
    p_status,
    v_transition_kind
  );

  return query
  select v_bike.id, p_status, v_next_active_rider_id;
end;
$$;

revoke execute on function public.update_bike_status_with_event(
  text,
  uuid,
  public.bike_status,
  public.bike_status,
  timestamptz,
  text,
  jsonb,
  uuid,
  uuid,
  timestamptz,
  text
) from public, anon;

grant execute on function public.update_bike_status_with_event(
  text,
  uuid,
  public.bike_status,
  public.bike_status,
  timestamptz,
  text,
  jsonb,
  uuid,
  uuid,
  timestamptz,
  text
) to authenticated;
