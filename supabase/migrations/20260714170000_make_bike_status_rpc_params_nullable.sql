-- Make nullable RPC params explicit (placed last) so generated client types
-- reflect reality: active_rider_id / timestamps / locations are nullable.
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
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is not null then
    if p_actor_id != v_user_id then
      if not exists (
        select 1 from public.profiles where id = v_user_id and is_admin
      ) then
        raise exception 'Unauthorized: actor must match authenticated user or caller must be admin';
      end if;
    end if;
  end if;

  return query
  with updated_bike as (
    update public.bikes as bike
    set
      status = p_status,
      active_rider_id = p_active_rider_id,
      active_ride_started_at = p_active_ride_started_at,
      active_ride_start_location = p_active_ride_start_location,
      last_reported_at = p_last_reported_at,
      updated_at = p_last_reported_at
    where
      bike.id = p_bike_id
      and bike.status = p_expected_status
      and bike.active_rider_id is not distinct from p_expected_active_rider_id
    returning bike.id, bike.status, bike.active_rider_id
  ),
  inserted_event as (
    insert into public.bike_status_events (
      actor_id,
      bike_id,
      context,
      from_status,
      to_status,
      transition_kind
    )
    select
      p_actor_id,
      p_bike_id,
      p_context,
      p_expected_status,
      updated_bike.status,
      p_transition_kind
    from updated_bike
    returning 1
  )
  select updated_bike.id, updated_bike.status, updated_bike.active_rider_id
  from updated_bike
  where exists (select 1 from inserted_event);
end;
$$;

revoke execute on function public.update_bike_status_with_event(text, uuid, public.bike_status, public.bike_status, timestamptz, text, jsonb, uuid, uuid, timestamptz, text) from public;
grant execute on function public.update_bike_status_with_event(text, uuid, public.bike_status, public.bike_status, timestamptz, text, jsonb, uuid, uuid, timestamptz, text) to authenticated;

