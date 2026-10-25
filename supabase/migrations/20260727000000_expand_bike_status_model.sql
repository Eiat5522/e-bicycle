-- Replace the legacy enum instead of adding labels in place. PostgreSQL does
-- not support removing enum labels, and labels added in a migration
-- transaction cannot safely be used until that transaction commits.

lock table public.bikes, public.bike_status_events in access exclusive mode;

-- The function parameters and return row depend on the enum OID, so release
-- that dependency before replacing the type.
create temporary table bike_status_rpc_execute_acl on commit drop as
select
  case when expanded.grantee = 0 then 'PUBLIC' else grantee.rolname end as grantee,
  expanded.is_grantable
from pg_catalog.pg_proc as procedure
cross join lateral pg_catalog.aclexplode(
  coalesce(
    procedure.proacl,
    pg_catalog.acldefault('f', procedure.proowner)
  )
) as expanded
left join pg_catalog.pg_roles as grantee on grantee.oid = expanded.grantee
where procedure.oid = 'public.update_bike_status_with_event(text,uuid,public.bike_status,public.bike_status,timestamp with time zone,text,jsonb,uuid,uuid,timestamp with time zone,text)'::regprocedure
  and expanded.privilege_type = 'EXECUTE';

do $$
begin
  if exists (
    select 1
    from bike_status_rpc_execute_acl
    where grantee in ('PUBLIC', 'anon')
  ) then
    raise exception 'Refusing to preserve insecure bike-status RPC execute grants';
  end if;

  if not exists (
    select 1
    from bike_status_rpc_execute_acl
    where grantee = 'authenticated'
  ) then
    raise exception 'Authenticated bike-status RPC execute grant is missing';
  end if;
end;
$$;

drop function if exists public.update_bike_status_with_event(
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
);

alter table public.bikes alter column status drop default;
alter type public.bike_status rename to bike_status_legacy;

create type public.bike_status as enum (
  'ready_to_rent',
  'reserved',
  'in_use',
  'returned_pending_inspection',
  'charging',
  'maintenance_required',
  'out_of_service'
);

-- Unknown legacy labels intentionally fail the cast and roll back the whole
-- migration rather than being silently mapped to a rentable state.
alter table public.bikes
  alter column status type public.bike_status
  using (
    case status::text
      when 'available' then 'ready_to_rent'
      when 'maintenance' then 'maintenance_required'
      else status::text
    end
  )::public.bike_status;

alter table public.bike_status_events
  alter column from_status type public.bike_status
  using (
    case from_status::text
      when 'available' then 'ready_to_rent'
      when 'maintenance' then 'maintenance_required'
      else from_status::text
    end
  )::public.bike_status,
  alter column to_status type public.bike_status
  using (
    case to_status::text
      when 'available' then 'ready_to_rent'
      when 'maintenance' then 'maintenance_required'
      else to_status::text
    end
  )::public.bike_status;

alter table public.bikes
  alter column status set default 'ready_to_rent'::public.bike_status;

drop type public.bike_status_legacy;

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
    from public.profiles as profile
    where profile.id = v_user_id and profile.is_admin
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

revoke all on function public.update_bike_status_with_event(
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
) from public;

do $$
declare
  execute_acl record;
begin
  for execute_acl in
    select grantee, is_grantable
    from bike_status_rpc_execute_acl
    where grantee <> 'PUBLIC'
  loop
    execute format(
      'grant execute on function public.update_bike_status_with_event(text, uuid, public.bike_status, public.bike_status, timestamptz, text, jsonb, uuid, uuid, timestamptz, text) to %I%s',
      execute_acl.grantee,
      case when execute_acl.is_grantable then ' with grant option' else '' end
    );
  end loop;
end;
$$;
