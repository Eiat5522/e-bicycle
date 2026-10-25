-- Caller-scoped immutable completion receipts. The approved fare/reward/audit
-- implementation remains unchanged and runs in this same transaction.
create table if not exists private.ride_completion_receipts (
  actor_id uuid not null references public.profiles(id),
  request_id text not null,
  request jsonb not null,
  result public.bike_ride_history not null,
  primary key (actor_id, request_id)
);
revoke all on private.ride_completion_receipts from public, anon, authenticated;

-- Legacy public.complete_ride retains its existing immediate-completion contract
-- for existing clients. Recovery callers MUST use only this scoped RPC; there is
-- deliberately no unscoped recoverable overload or mobile fallback.
-- This migration is unreleased. Remove the earlier unscoped draft overload on replay.
drop function if exists public.complete_ride_recoverable(text,text,numeric,text,text,jsonb,jsonb,numeric);
create or replace function public.complete_ride_recoverable(
  p_request_id text,
  p_bike_id text,
  p_expected_ride_started_at timestamptz,
  p_distance_km numeric default 0,
  p_end_location text default null,
  p_route_label text default null,
  p_route jsonb default '[]'::jsonb,
  p_checkpoints jsonb default '[]'::jsonb,
  p_co2_saved_kg numeric default 0
) returns public.bike_ride_history
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_request jsonb := jsonb_build_object(
    'expected_start', p_expected_ride_started_at, 'bike', p_bike_id, 'distance', p_distance_km, 'end', p_end_location,
    'label', p_route_label, 'route', p_route, 'checkpoints', p_checkpoints,
    'co2', p_co2_saved_kg);
  v_receipt private.ride_completion_receipts;
  v_result public.bike_ride_history;
  v_bike public.bikes;
begin
  if v_actor is null then raise exception 'Authentication required'; end if;
  if p_request_id is null or length(p_request_id) not between 1 and 200 then
    raise exception 'Completion identity required';
  end if;
  -- Serializes every call for this caller/identity, including different bikes.
  perform pg_advisory_xact_lock(hashtextextended(v_actor::text || ':' || p_request_id, 0));
  select * into v_receipt from private.ride_completion_receipts
    where actor_id = v_actor and request_id = p_request_id;
  if found then
    if v_receipt.request is distinct from v_request then
      raise exception 'Completion identity reused with a different request';
    end if;
    return v_receipt.result;
  end if;
  -- Lock the canonical row before checking identity; retain the lock throughout
  -- canonical completion. Never fetch/rebind the expected identity on retry.
  select * into v_bike from public.bikes where id = p_bike_id for update;
  if not found then raise exception 'Bike not found'; end if;
  if v_bike.status <> 'in_use' then raise exception 'Bike is not currently in use'; end if;
  if v_bike.active_rider_id is distinct from v_actor then
    raise exception 'Ride belongs to a different rider';
  end if;
  if p_expected_ride_started_at is null or
     v_bike.active_ride_started_at is distinct from p_expected_ride_started_at then
    raise exception 'Active ride identity mismatch';
  end if;
  -- Ownership, active ride, wallet, fare, rewards, rental and audit are all
  -- validated/mutated by the canonical implementation under the bike row lock.
  v_result := private.complete_ride(p_bike_id, p_distance_km, p_end_location,
    p_route_label, p_route, p_checkpoints, p_co2_saved_kg);
  insert into private.ride_completion_receipts(actor_id, request_id, request, result)
    values (v_actor, p_request_id, v_request, v_result);
  return v_result;
end;
$$;
revoke all on function public.complete_ride_recoverable(text,text,timestamptz,numeric,text,text,jsonb,jsonb,numeric) from public, anon;
grant execute on function public.complete_ride_recoverable(text,text,timestamptz,numeric,text,text,jsonb,jsonb,numeric) to authenticated;
