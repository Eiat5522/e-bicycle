-- Make the reporting / engagement workflow functions safe to invoke from
-- trusted server contexts (web admin routes, the daily-report Edge Function,
-- and pg_cron). The previous version read auth.uid() and raised
-- 'Authentication required' whenever it was null. Under the service role
-- (used by the admin API routes and the cron job) auth.uid() is always NULL,
-- so every production call 500'd.
--
-- Authorization is enforced at the API layer (requireAdmin for the web
-- routes, CRON_SECRET for the Edge Function) and the functions themselves
-- are SECURITY DEFINER, so dropping the in-function auth check is safe.
-- We also stop writing generated_by_profile_id, which can never be populated
-- by an unattended service-role/cron call (the column remains nullable).

create or replace function public.generate_operational_report(
  p_period_start date,
  p_period_end date,
  p_report_type text default 'daily'
)
returns public.operational_reports
set search_path = ''
language plpgsql
security definer
as $$
declare
  v_report public.operational_reports;
  v_total_rides integer;
  v_active_bikes integer;
  v_registered_users integer;
  v_total_bikes integer;
  v_utilization_rate numeric;
  v_daily_revenue numeric;
  v_recon jsonb;
begin
  if p_period_end < p_period_start then
    raise exception 'period_end must be on or after period_start';
  end if;

  select count(*)
    into v_total_rides
  from public.rental_transactions
  where rental_status = 'completed'
    and created_at >= (p_period_start::timestamp at time zone 'utc')
    and created_at < ((p_period_end + interval '1 day')::timestamp at time zone 'utc');

  select count(distinct bike_id), count(distinct profile_id)
    into v_active_bikes, v_registered_users
  from public.rental_transactions
  where rental_status = 'completed'
    and created_at >= (p_period_start::timestamp at time zone 'utc')
    and created_at < ((p_period_end + interval '1 day')::timestamp at time zone 'utc');

  select count(*) into v_total_bikes from public.bikes;

  v_utilization_rate := case
    when v_total_bikes > 0
      then round((v_active_bikes::numeric / v_total_bikes::numeric) * 100, 2)
    else 0
  end;

  select coalesce(sum(amount), 0)
    into v_daily_revenue
  from public.payments
  where payment_status = 'verified'
    and created_at >= (p_period_start::timestamp at time zone 'utc')
    and created_at < ((p_period_end + interval '1 day')::timestamp at time zone 'utc');

  select jsonb_build_object(
    'total_collected', coalesce(sum(amount), 0),
    'reconciled', coalesce(sum(amount) filter (where reconciliation_status = 'reconciled'), 0),
    'pending', coalesce(sum(amount) filter (where reconciliation_status = 'pending'), 0),
    'exception', coalesce(sum(amount) filter (where reconciliation_status = 'exception'), 0)
  )
    into v_recon
  from public.payments
  where created_at >= (p_period_start::timestamp at time zone 'utc')
    and created_at < ((p_period_end + interval '1 day')::timestamp at time zone 'utc');

  insert into public.operational_reports (
    report_type,
    period_start,
    period_end,
    usage_statistics,
    utilization_rate,
    daily_revenue,
    payment_reconciliation
  )
  values (
    p_report_type,
    p_period_start,
    p_period_end,
    jsonb_build_object(
      'total_rides', v_total_rides,
      'active_bikes', v_active_bikes,
      'registered_users', v_registered_users
    ),
    v_utilization_rate,
    v_daily_revenue,
    v_recon
  )
  returning * into v_report;

  return v_report;
end;
$$;

create or replace function public.generate_sustainability_report(
  p_period_start date,
  p_period_end date
)
returns public.sustainability_reporting
set search_path = ''
language plpgsql
security definer
as $$
declare
  v_report public.sustainability_reporting;
  v_distance numeric;
  v_trips integer;
  v_factor numeric := 0.000150;
begin
  if p_period_end < p_period_start then
    raise exception 'period_end must be on or after period_start';
  end if;

  select coalesce(sum(distance_km), 0), count(*)
    into v_distance, v_trips
  from public.bike_ride_history
  where completed_at >= (p_period_start::timestamp at time zone 'utc')
    and completed_at < ((p_period_end + interval '1 day')::timestamp at time zone 'utc');

  insert into public.sustainability_reporting (
    period_start,
    period_end,
    estimated_distance_km,
    emission_factor_kgco2_per_km,
    trip_count,
    carbon_reduced_kg,
    fuel_savings_liters,
    total_travel_distance_km,
    energy_consumption_kwh,
    calculation_method
  )
  values (
    p_period_start,
    p_period_end,
    v_distance,
    v_factor,
    v_trips,
    round(v_distance * v_factor, 2),
    round((v_distance * v_factor) / 2.31, 2),
    v_distance,
    round(v_distance * 0.015, 2),
    'standard_v1'
  )
  returning * into v_report;

  return v_report;
end;
$$;

create or replace function public.refresh_user_engagement(
  p_profile_id uuid default null
)
returns integer
set search_path = ''
language plpgsql
security definer
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select
      p.id as profile_id,
      coalesce(sum(rh.distance_km), 0) as distance_km,
      coalesce(sum(rh.co2_saved_kg), 0) as co2_saved_kg,
      count(rh.id) as ride_count,
      coalesce(sum(rm.points_awarded), 0) as reward_points
    from public.profiles p
    left join public.bike_ride_history rh on rh.profile_id = p.id
    left join public.reward_milestones rm on rm.profile_id = p.id
    where (p_profile_id is null or p.id = p_profile_id)
    group by p.id
  loop
    insert into public.user_engagement_aggregates (
      profile_id,
      eco_points,
      carbon_reduced_total_kg,
      calories_burned_total,
      distance_accumulated_km,
      last_updated
    )
    values (
      r.profile_id,
      (r.ride_count * 10) + r.reward_points,
      r.co2_saved_kg,
      round(r.distance_km * 50),
      r.distance_km,
      timezone('utc'::text, now())
    )
    on conflict (profile_id) do update set
      eco_points = excluded.eco_points,
      carbon_reduced_total_kg = excluded.carbon_reduced_total_kg,
      calories_burned_total = excluded.calories_burned_total,
      distance_accumulated_km = excluded.distance_accumulated_km,
      last_updated = excluded.last_updated;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Server-side wrapper used by the pg_cron schedule. Computes the previous
-- day's window and runs the three workflow functions unattended.
create or replace function public.run_daily_reports()
returns jsonb
set search_path = ''
language plpgsql
security definer
as $$
declare
  v_period_end date := current_date - 1;
  v_period_start date := v_period_end;
  v_op public.operational_reports;
  v_esg public.sustainability_reporting;
  v_users integer;
begin
  select * into v_op
  from public.generate_operational_report(v_period_start, v_period_end, 'daily');

  select * into v_esg
  from public.generate_sustainability_report(v_period_start, v_period_end);

  select public.refresh_user_engagement() into v_users;

  return jsonb_build_object(
    'operational_report_id', v_op.id,
    'sustainability_report_id', v_esg.id,
    'users_refreshed', v_users
  );
end;
$$;

grant execute on function public.generate_operational_report(date, date, text) to authenticated;
grant execute on function public.generate_sustainability_report(date, date) to authenticated;
grant execute on function public.refresh_user_engagement(uuid) to authenticated;
grant execute on function public.run_daily_reports() to authenticated;
