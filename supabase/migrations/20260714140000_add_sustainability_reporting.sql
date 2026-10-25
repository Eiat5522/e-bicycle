create table if not exists public.sustainability_reporting (
  id uuid primary key default extensions.gen_random_uuid(),
  report_id uuid references public.operational_reports (id) on delete set null,
  period_start date not null,
  period_end date not null,
  estimated_distance_km numeric(12, 2) check (estimated_distance_km is null or estimated_distance_km >= 0),
  emission_factor_kgco2_per_km numeric(8, 6) check (emission_factor_kgco2_per_km is null or emission_factor_kgco2_per_km >= 0),
  trip_count integer not null default 0 check (trip_count >= 0),
  carbon_reduced_kg numeric(12, 2) check (carbon_reduced_kg is null or carbon_reduced_kg >= 0),
  fuel_savings_liters numeric(12, 2) check (fuel_savings_liters is null or fuel_savings_liters >= 0),
  total_travel_distance_km numeric(12, 2) check (total_travel_distance_km is null or total_travel_distance_km >= 0),
  energy_consumption_kwh numeric(12, 2) check (energy_consumption_kwh is null or energy_consumption_kwh >= 0),
  calculation_method text not null default 'standard_v1'
    check (calculation_method in ('standard_v1', 'custom', 'manual')),
  generated_by_profile_id uuid references public.profiles (id) on delete set null,
  generated_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  check (period_end >= period_start),
  check (generated_at >= created_at),
  unique (report_id, period_start, period_end)
);

create index if not exists sustainability_reporting_period_idx
  on public.sustainability_reporting (period_start desc, period_end desc);

create index if not exists sustainability_reporting_report_id_idx
  on public.sustainability_reporting (report_id);

alter table public.sustainability_reporting enable row level security;

drop policy if exists "sustainability_reporting_select_authenticated" on public.sustainability_reporting;
create policy "sustainability_reporting_select_authenticated"
on public.sustainability_reporting
for select
to authenticated
using (true);

drop policy if exists "sustainability_reporting_admin_insert" on public.sustainability_reporting;
create policy "sustainability_reporting_admin_insert"
on public.sustainability_reporting
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "sustainability_reporting_admin_update" on public.sustainability_reporting;
create policy "sustainability_reporting_admin_update"
on public.sustainability_reporting
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "sustainability_reporting_admin_delete" on public.sustainability_reporting;
create policy "sustainability_reporting_admin_delete"
on public.sustainability_reporting
for delete
to authenticated
using (private.is_admin());
