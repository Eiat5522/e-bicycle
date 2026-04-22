alter table public.bikes
  add column if not exists rate_per_minute numeric(10, 4) not null default 0,
  add column if not exists active_ride_started_at timestamptz,
  add column if not exists active_ride_start_location text;

update public.bikes
set rate_per_minute = case id
  when 'G-104' then 0.1200
  when 'G-205' then 0.0900
  when 'G-318' then 0.0800
  when 'G-412' then 0.1400
  when 'G-509' then 0.1000
  when 'G-620' then 0.1200
  else rate_per_minute
end
where rate_per_minute = 0;

-- No ride event or audit-log table exists to recover exact start times for already
-- in-flight rows (status = 'in_use', active_rider_id is not null). Backfilling
-- active_ride_started_at with the migration time is an approximation that can
-- understate billable ride duration and revenue for those affected rows.
update public.bikes
set active_ride_started_at = coalesce(active_ride_started_at, timezone('utc'::text, now())),
    active_ride_start_location = coalesce(active_ride_start_location, location)
where status = 'in_use' and active_rider_id is not null;

alter table public.bike_ride_history
  add column if not exists rate_per_minute numeric(10, 4) not null default 0,
  add column if not exists billable_minutes integer not null default 0,
  add column if not exists currency_code text not null default 'THB',
  add column if not exists wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  add column if not exists fare_calculation_method text not null default 'ceil_minutes_v1';

update public.bike_ride_history
set
  billable_minutes = greatest(1, ceil(duration_sec::numeric / 60)::integer),
  rate_per_minute = case
    when duration_sec > 0 then round(total_cost / greatest(1, ceil(duration_sec::numeric / 60)::integer), 4)
    else rate_per_minute
  end,
  currency_code = coalesce(nullif(currency_code, ''), 'THB'),
  fare_calculation_method = coalesce(nullif(fare_calculation_method, ''), 'ceil_minutes_v1');

update public.bike_ride_history as ride
set wallet_transaction_id = matched.id
from (
  select distinct on (r.id) r.id as ride_id, t.id
  from public.bike_ride_history r
  join public.wallet_transactions t
    on r.profile_id = t.wallet_id
   and t.type = 'ride'
   and t.amount = -r.total_cost
   and abs(extract(epoch from t.created_at - r.completed_at)) <= 60
  where r.wallet_transaction_id is null
  order by r.id, abs(extract(epoch from t.created_at - r.completed_at))
) as matched
where ride.wallet_transaction_id is null
  and ride.id = matched.ride_id;

create index if not exists bike_ride_history_wallet_transaction_id_idx
  on public.bike_ride_history (wallet_transaction_id);

create index if not exists bike_ride_history_completed_at_total_cost_idx
  on public.bike_ride_history (completed_at desc, total_cost desc);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'bikes_rate_per_minute_nonnegative'
      and conrelid = 'public.bikes'::regclass
  ) then
    alter table public.bikes
      add constraint bikes_rate_per_minute_nonnegative check (rate_per_minute >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bike_ride_history_rate_per_minute_nonnegative'
      and conrelid = 'public.bike_ride_history'::regclass
  ) then
    alter table public.bike_ride_history
      add constraint bike_ride_history_rate_per_minute_nonnegative check (rate_per_minute >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bike_ride_history_billable_minutes_nonnegative'
      and conrelid = 'public.bike_ride_history'::regclass
  ) then
    alter table public.bike_ride_history
      add constraint bike_ride_history_billable_minutes_nonnegative check (billable_minutes >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bike_ride_history_currency_code_format'
      and conrelid = 'public.bike_ride_history'::regclass
  ) then
    alter table public.bike_ride_history
      add constraint bike_ride_history_currency_code_format check (currency_code ~ '^[A-Z]{3}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'bike_ride_history_total_cost_nonnegative'
      and conrelid = 'public.bike_ride_history'::regclass
  ) then
    alter table public.bike_ride_history
      add constraint bike_ride_history_total_cost_nonnegative check (total_cost >= 0);
  end if;
end $$;

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
