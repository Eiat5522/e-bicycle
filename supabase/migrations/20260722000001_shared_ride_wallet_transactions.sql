alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;

alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (type in ('ride', 'shared_ride', 'top_up', 'reward'));

create or replace function private.complete_ride(
  p_bike_id text,
  p_distance_km numeric default 0,
  p_end_location text default null,
  p_route_label text default null,
  p_route jsonb default '[]'::jsonb,
  p_checkpoints jsonb default '[]'::jsonb,
  p_co2_saved_kg numeric default 0
)
returns public.bike_ride_history
set search_path = ''
as $$
declare
  v_bike public.bikes;
  v_wallet public.wallets;
  v_ride public.bike_ride_history;
  v_transaction_id uuid;
  v_user_id uuid;
  v_completed_at timestamptz := timezone('utc'::text, now());
  v_duration_sec integer;
  v_billable_minutes integer;
  v_total_cost numeric(10, 2);
  v_end_location text;
  v_route_label text;
  v_payment_label text;
  v_is_qualifying_ride boolean;
  v_qualifying_ride_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_bike
  from public.bikes
  where id = p_bike_id
  for update;

  if not found then
    raise exception 'Bike not found';
  end if;

  if v_bike.status <> 'in_use' then
    raise exception 'Bike is not currently in use';
  end if;

  if v_bike.active_rider_id is distinct from v_user_id then
    raise exception 'Ride belongs to a different rider';
  end if;

  select *
  into v_wallet
  from public.wallets
  where id = v_user_id
  for update;

  if not found then
    raise exception 'Wallet record is missing for this rider';
  end if;

  v_duration_sec := greatest(0, floor(extract(epoch from v_completed_at - v_bike.active_ride_started_at))::integer);
  v_billable_minutes := greatest(1, ceil(v_duration_sec::numeric / 60)::integer);
  v_total_cost := round((v_billable_minutes * v_bike.rate_per_minute)::numeric, 2);

  if v_wallet.balance < v_total_cost then
    raise exception 'Insufficient wallet balance';
  end if;

  v_end_location := coalesce(nullif(trim(p_end_location), ''), v_bike.location);
  v_route_label := coalesce(
    nullif(trim(p_route_label), ''),
    concat(coalesce(v_bike.active_ride_start_location, v_bike.location), ' to ', v_end_location)
  );
  v_payment_label := concat('Charged to ', coalesce(v_wallet.payment_methods[1], 'your Glide wallet'));

  update public.wallets
  set
    balance = balance - v_total_cost,
    updated_at = timezone('utc'::text, now())
  where id = v_user_id;

  insert into public.wallet_transactions (
    wallet_id,
    type,
    title,
    subtitle,
    amount,
    created_at
  )
  values (
    v_user_id,
    'shared_ride',
    v_route_label,
    concat(to_char(v_completed_at, 'Mon DD, YYYY'), ' - ', v_payment_label),
    -v_total_cost,
    v_completed_at
  )
  returning id into v_transaction_id;

  insert into public.bike_ride_history (
    bike_id,
    profile_id,
    started_at,
    completed_at,
    duration_sec,
    distance_km,
    total_cost,
    co2_saved_kg,
    start_location,
    end_location,
    route_label,
    payment_label,
    route,
    checkpoints,
    rate_per_minute,
    billable_minutes,
    currency_code,
    wallet_transaction_id,
    fare_calculation_method
  )
  values (
    v_bike.id,
    v_user_id,
    v_bike.active_ride_started_at,
    v_completed_at,
    v_duration_sec,
    greatest(0, coalesce(p_distance_km, 0)),
    v_total_cost,
    greatest(0, coalesce(p_co2_saved_kg, 0)),
    coalesce(v_bike.active_ride_start_location, v_bike.location),
    v_end_location,
    v_route_label,
    v_payment_label,
    coalesce(p_route, '[]'::jsonb),
    coalesce(p_checkpoints, '[]'::jsonb),
    v_bike.rate_per_minute,
    v_billable_minutes,
    'THB',
    v_transaction_id,
    'ceil_minutes_v1'
  )
  returning * into v_ride;

  v_is_qualifying_ride := v_duration_sec >= 300 and greatest(0, coalesce(p_distance_km, 0)) >= 1 and v_transaction_id is not null;

  if v_is_qualifying_ride then
    select count(*)
    into v_qualifying_ride_count
    from public.bike_ride_history
    where profile_id = v_user_id
      and duration_sec >= 300
      and distance_km >= 1
      and wallet_transaction_id is not null;

    if v_qualifying_ride_count = 1 then
      perform private.award_reward_milestone(
        v_user_id,
        'first_ride',
        'Milestone unlocked: First completed ride',
        'Milestone key: first_ride',
        20,
        v_completed_at
      );
    end if;

    if v_qualifying_ride_count = 5 then
      perform private.award_reward_milestone(
        v_user_id,
        'five_rides',
        'Milestone unlocked: 5 qualifying rides',
        'Milestone key: five_rides',
        20,
        v_completed_at
      );
    end if;

    if v_qualifying_ride_count = 10 then
      perform private.award_reward_milestone(
        v_user_id,
        'ten_rides',
        'Milestone unlocked: 10 qualifying rides',
        'Milestone key: ten_rides',
        50,
        v_completed_at
      );
    end if;
  end if;

  update public.bikes
  set
    status = 'available',
    active_rider_id = null,
    active_ride_started_at = null,
    active_ride_start_location = null,
    last_reported_at = v_completed_at,
    updated_at = timezone('utc'::text, now())
  where id = v_bike.id;

  return v_ride;
end;
$$ language plpgsql security definer;

revoke all on function private.complete_ride(text, numeric, text, text, jsonb, jsonb, numeric) from public;
grant execute on function private.complete_ride(text, numeric, text, text, jsonb, jsonb, numeric) to authenticated;

create or replace function public.complete_ride(
  p_bike_id text,
  p_distance_km numeric default 0,
  p_end_location text default null,
  p_route_label text default null,
  p_route jsonb default '[]'::jsonb,
  p_checkpoints jsonb default '[]'::jsonb,
  p_co2_saved_kg numeric default 0
)
returns public.bike_ride_history
set search_path = ''
as $$
  select private.complete_ride(
    p_bike_id,
    p_distance_km,
    p_end_location,
    p_route_label,
    p_route,
    p_checkpoints,
    p_co2_saved_kg
  );
$$ language sql;

revoke all on function public.complete_ride(text, numeric, text, text, jsonb, jsonb, numeric) from public;
grant execute on function public.complete_ride(text, numeric, text, text, jsonb, jsonb, numeric) to authenticated;
