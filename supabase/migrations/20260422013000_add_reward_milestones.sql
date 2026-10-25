create table if not exists public.reward_milestones (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  milestone_key text not null,
  title text not null,
  points_awarded integer not null check (points_awarded > 0),
  achieved_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  primary key (profile_id, milestone_key)
);

create index if not exists reward_milestones_profile_id_achieved_at_idx
  on public.reward_milestones (profile_id, achieved_at desc);

alter table public.reward_milestones enable row level security;

drop policy if exists "reward_milestones_select_own" on public.reward_milestones;
create policy "reward_milestones_select_own"
on public.reward_milestones
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

create or replace function private.award_reward_milestone(
  p_profile_id uuid,
  p_milestone_key text,
  p_title text,
  p_subtitle text,
  p_points integer,
  p_achieved_at timestamptz default timezone('utc'::text, now())
)
returns boolean
set search_path = ''
as $$
begin
  if p_profile_id is null then
    raise exception 'Reward milestone profile is required';
  end if;

  if p_points <= 0 then
    raise exception 'Reward milestone points must be positive';
  end if;

  insert into public.reward_milestones (profile_id, milestone_key, title, points_awarded, achieved_at)
  values (p_profile_id, p_milestone_key, p_title, p_points, p_achieved_at)
  on conflict (profile_id, milestone_key) do nothing;

  if not found then
    return false;
  end if;

  update public.wallets
  set
    points = points + p_points,
    updated_at = timezone('utc'::text, now())
  where id = p_profile_id;

  if not found then
    insert into public.wallets (id, balance, points)
    values (p_profile_id, 0, p_points)
    on conflict (id) do update
    set
      points = public.wallets.points + excluded.points,
      updated_at = timezone('utc'::text, now());
  end if;

  insert into public.wallet_transactions (wallet_id, type, title, subtitle, amount, created_at)
  values (p_profile_id, 'reward', p_title, p_subtitle, p_points, p_achieved_at);

  return true;
end;
$$ language plpgsql security definer;

revoke all on function private.award_reward_milestone(uuid, text, text, text, integer, timestamptz) from public;
grant execute on function private.award_reward_milestone(uuid, text, text, text, integer, timestamptz) to authenticated;

create or replace function public.handle_new_user()
returns trigger
set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), 'Rider')
  )
  on conflict (id) do nothing;

  insert into public.wallets (id)
  values (new.id)
  on conflict (id) do nothing;

  perform private.award_reward_milestone(
    new.id,
    'signup',
    'Milestone unlocked: Welcome aboard',
    'Milestone key: signup',
    10,
    timezone('utc'::text, now())
  );

  return new;
end;
$$ language plpgsql security definer;

create or replace function public.apply_wallet_top_up(
  p_amount numeric,
  p_title text,
  p_subtitle text
)
returns public.wallets
set search_path = ''
as $$
declare
  v_wallet public.wallets;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_amount <= 0 then
    raise exception 'Top-up amount must be positive';
  end if;

  update public.wallets
  set
    balance = balance + p_amount,
    updated_at = timezone('utc'::text, now())
  where id = auth.uid()
  returning * into v_wallet;

  if not found then
    insert into public.wallets (id, balance, points)
    values (
      auth.uid(),
      p_amount,
      0
    )
    returning * into v_wallet;
  end if;

  insert into public.wallet_transactions (wallet_id, type, title, subtitle, amount)
  values (auth.uid(), 'top_up', p_title, p_subtitle, p_amount);

  perform private.award_reward_milestone(
    auth.uid(),
    'first_wallet_top_up',
    'Milestone unlocked: First wallet top-up',
    'Milestone key: first_wallet_top_up',
    10,
    timezone('utc'::text, now())
  );

  return v_wallet;
end;
$$ language plpgsql security definer;

revoke all on function public.apply_wallet_top_up(numeric, text, text) from public;
grant execute on function public.apply_wallet_top_up(numeric, text, text) to authenticated;

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
  v_user_id uuid := auth.uid();
  v_bike public.bikes;
  v_wallet public.wallets;
  v_billable_minutes integer;
  v_completed_at timestamptz := timezone('utc'::text, now());
  v_duration_sec integer;
  v_total_cost numeric(10, 2);
  v_end_location text;
  v_route_label text;
  v_payment_label text;
  v_transaction_id uuid;
  v_ride public.bike_ride_history;
  v_is_qualifying_ride boolean := false;
  v_qualifying_ride_count integer := 0;
begin
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

  if v_bike.status <> 'in_use' or v_bike.active_rider_id is distinct from v_user_id then
    raise exception 'Only the active rider can complete this ride';
  end if;

  if v_bike.active_ride_started_at is null then
    raise exception 'Ride start time is missing';
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
    'ride',
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
