-- Repair the geography predicate used by check_service_area. ST_Contains only
-- supports geometry in this PostGIS install; ST_Covers supports geography and
-- deliberately treats a service-area boundary point as inside the area.
create or replace function public.check_service_area(
  p_latitude double precision,
  p_longitude double precision
)
returns public.service_areas
set search_path = ''
language plpgsql
as $$
declare
  v_area public.service_areas;
begin
  select *
    into v_area
  from public.service_areas
  where status = 'active'
    and extensions.st_covers(
      boundary,
      extensions.st_setsrid(
        extensions.st_makepoint(p_longitude, p_latitude),
        4326
      )::extensions.geography
    )
  limit 1;

  return v_area;
end;
$$;

-- Regeneration is intentionally idempotent because daily reports can be
-- retried by an admin route or cron after a partial failure.
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
  on conflict (report_type, period_start, period_end) do update set
    usage_statistics = excluded.usage_statistics,
    utilization_rate = excluded.utilization_rate,
    daily_revenue = excluded.daily_revenue,
    payment_reconciliation = excluded.payment_reconciliation,
    generated_at = timezone('utc'::text, now())
  returning * into v_report;

  return v_report;
end;
$$;
