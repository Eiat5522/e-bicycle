create extension if not exists postgis schema extensions;

create table if not exists public.operational_reports (
  id uuid primary key default extensions.gen_random_uuid(),
  report_type text not null
    check (report_type in ('daily', 'weekly', 'monthly', 'custom')),
  period_start date not null,
  period_end date not null,
  usage_statistics jsonb not null default '{}'::jsonb,
  utilization_rate numeric(5, 2)
    check (utilization_rate is null or (utilization_rate >= 0 and utilization_rate <= 100)),
  app_availability_rate numeric(5, 2)
    check (app_availability_rate is null or (app_availability_rate >= 0 and app_availability_rate <= 100)),
  service_downtime_minutes integer
    check (service_downtime_minutes is null or service_downtime_minutes >= 0),
  user_satisfaction_score numeric(5, 2),
  daily_revenue numeric(12, 2),
  payment_reconciliation jsonb not null default '{}'::jsonb,
  generated_by_profile_id uuid references public.profiles (id) on delete set null,
  generated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (period_end >= period_start),
  unique (report_type, period_start, period_end)
);

create index if not exists operational_reports_period_idx
  on public.operational_reports (period_start desc, period_end desc);

create table if not exists public.battery_charging_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid references public.stations (id) on delete set null,
  battery_id uuid not null references public.batteries (id) on delete cascade,
  charging_slot_id text,
  status text not null default 'started'
    check (status in ('started', 'charging', 'completed', 'interrupted', 'failed', 'swapped')),
  started_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  voltage numeric(8, 2),
  current_amp numeric(8, 2),
  temperature_c numeric(5, 2),
  charge_cycles integer check (charge_cycles is null or charge_cycles >= 0),
  state_of_health numeric(5, 2)
    check (state_of_health is null or (state_of_health >= 0 and state_of_health <= 100)),
  swap_from_battery_id uuid references public.batteries (id) on delete set null,
  swap_to_battery_id uuid references public.batteries (id) on delete set null,
  source_system text not null default 'station'
    check (source_system in ('station', 'admin_dashboard', 'manual_import', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (completed_at is null or completed_at >= started_at)
);

create index if not exists battery_charging_logs_battery_started_at_idx
  on public.battery_charging_logs (battery_id, started_at desc);

create index if not exists battery_charging_logs_station_started_at_idx
  on public.battery_charging_logs (station_id, started_at desc);

create table if not exists public.service_areas (
  id uuid primary key default extensions.gen_random_uuid(),
  zone_code text unique,
  zone_name text not null,
  city_name text not null,
  zone_type text not null
    check (zone_type in ('returnable', 'prohibited', 'service', 'slow_zone', 'other')),
  boundary extensions.geography(Polygon, 4326) not null,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists service_areas_boundary_gist_idx
  on public.service_areas using gist (boundary);

create index if not exists service_areas_zone_type_status_idx
  on public.service_areas (zone_type, status);

create table if not exists public.energy_management (
  id uuid primary key default extensions.gen_random_uuid(),
  station_id uuid references public.stations (id) on delete set null,
  recorded_at timestamptz not null default timezone('utc'::text, now()),
  total_power_demand_kw numeric(12, 3)
    check (total_power_demand_kw is null or total_power_demand_kw >= 0),
  phase_l1_kw numeric(12, 3) check (phase_l1_kw is null or phase_l1_kw >= 0),
  phase_l2_kw numeric(12, 3) check (phase_l2_kw is null or phase_l2_kw >= 0),
  phase_l3_kw numeric(12, 3) check (phase_l3_kw is null or phase_l3_kw >= 0),
  tou_rate_period text,
  applied_tou_rate numeric(12, 6)
    check (applied_tou_rate is null or applied_tou_rate >= 0),
  currency_code text not null default 'THB' check (currency_code ~ '^[A-Z]{3}$'),
  source_system text not null default 'station'
    check (source_system in ('station', 'utility', 'admin_dashboard', 'manual_import', 'system')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists energy_management_station_recorded_at_idx
  on public.energy_management (station_id, recorded_at desc);

create index if not exists energy_management_recorded_at_idx
  on public.energy_management (recorded_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_service_areas_updated_at'
      and tgrelid = 'public.service_areas'::regclass
  ) then
    create trigger handle_service_areas_updated_at
      before update on public.service_areas
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;
end $$;

alter table public.operational_reports enable row level security;
alter table public.battery_charging_logs enable row level security;
alter table public.service_areas enable row level security;
alter table public.energy_management enable row level security;

drop policy if exists "operational_reports_select_authenticated" on public.operational_reports;
create policy "operational_reports_select_authenticated"
on public.operational_reports
for select
to authenticated
using (true);

drop policy if exists "operational_reports_admin_insert" on public.operational_reports;
create policy "operational_reports_admin_insert"
on public.operational_reports
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "operational_reports_admin_update" on public.operational_reports;
create policy "operational_reports_admin_update"
on public.operational_reports
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "operational_reports_admin_delete" on public.operational_reports;
create policy "operational_reports_admin_delete"
on public.operational_reports
for delete
to authenticated
using (private.is_admin());

drop policy if exists "battery_charging_logs_admin_select" on public.battery_charging_logs;
create policy "battery_charging_logs_admin_select"
on public.battery_charging_logs
for select
to authenticated
using (private.is_admin());

drop policy if exists "battery_charging_logs_admin_insert" on public.battery_charging_logs;
create policy "battery_charging_logs_admin_insert"
on public.battery_charging_logs
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "battery_charging_logs_admin_update" on public.battery_charging_logs;
create policy "battery_charging_logs_admin_update"
on public.battery_charging_logs
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "battery_charging_logs_admin_delete" on public.battery_charging_logs;
create policy "battery_charging_logs_admin_delete"
on public.battery_charging_logs
for delete
to authenticated
using (private.is_admin());

drop policy if exists "service_areas_select_authenticated" on public.service_areas;
create policy "service_areas_select_authenticated"
on public.service_areas
for select
to authenticated
using (true);

drop policy if exists "service_areas_admin_insert" on public.service_areas;
create policy "service_areas_admin_insert"
on public.service_areas
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "service_areas_admin_update" on public.service_areas;
create policy "service_areas_admin_update"
on public.service_areas
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "service_areas_admin_delete" on public.service_areas;
create policy "service_areas_admin_delete"
on public.service_areas
for delete
to authenticated
using (private.is_admin());

drop policy if exists "energy_management_admin_select" on public.energy_management;
create policy "energy_management_admin_select"
on public.energy_management
for select
to authenticated
using (private.is_admin());

drop policy if exists "energy_management_admin_insert" on public.energy_management;
create policy "energy_management_admin_insert"
on public.energy_management
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "energy_management_admin_update" on public.energy_management;
create policy "energy_management_admin_update"
on public.energy_management
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "energy_management_admin_delete" on public.energy_management;
create policy "energy_management_admin_delete"
on public.energy_management
for delete
to authenticated
using (private.is_admin());
