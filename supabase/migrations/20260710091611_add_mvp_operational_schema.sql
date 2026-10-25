create table if not exists public.stations (
  id uuid primary key default extensions.gen_random_uuid(),
  station_code text unique,
  station_name text not null,
  location_text text,
  latitude double precision,
  longitude double precision,
  station_type text not null default 'hub'
    check (station_type in ('hub', 'kiosk', 'mobile_booth', 'storage', 'charging_room', 'other')),
  capacity integer not null default 0 check (capacity >= 0),
  charging_slot_count integer not null default 0 check (charging_slot_count >= 0),
  operating_status text not null default 'active'
    check (operating_status in ('active', 'inactive', 'maintenance', 'closed')),
  electricity_status text not null default 'normal'
    check (electricity_status in ('normal', 'limited', 'outage', 'unknown')),
  power_capacity_kw numeric(10, 2) check (power_capacity_kw is null or power_capacity_kw >= 0),
  equipment_inventory jsonb not null default '{}'::jsonb,
  phase_balance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists user_type text not null default 'citizen'
    check (user_type in ('citizen', 'tourist', 'staff')),
  add column if not exists user_status text not null default 'active'
    check (user_status in ('active', 'pending_verification', 'suspended', 'blacklisted')),
  add column if not exists registration_date timestamptz not null default timezone('utc'::text, now()),
  add column if not exists consent_agreed boolean not null default false,
  add column if not exists consent_agreed_at timestamptz,
  add column if not exists membership_id uuid,
  add column if not exists identity_verification_status text not null default 'unverified'
    check (identity_verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  add column if not exists student_status boolean not null default false,
  add column if not exists driver_license_reference text;

alter table public.bikes
  add column if not exists serial_number text,
  add column if not exists frame_number text,
  add column if not exists color text,
  add column if not exists qr_code text,
  add column if not exists station_id uuid references public.stations (id) on delete set null,
  add column if not exists battery_status text not null default 'unknown'
    check (battery_status in ('available', 'charging', 'low', 'depleted', 'abnormal', 'unknown')),
  add column if not exists device_status text not null default 'unknown'
    check (device_status in ('online', 'offline', 'fault', 'unknown')),
  add column if not exists maintenance_summary text;

create unique index if not exists bikes_qr_code_unique_idx
  on public.bikes (qr_code)
  where qr_code is not null;

create index if not exists bikes_station_id_idx
  on public.bikes (station_id);

create table if not exists public.staff_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  staff_name text not null,
  role text not null
    check (role in ('admin', 'operations_manager', 'assistant_operations_manager', 'station_admin', 'technician')),
  permissions jsonb not null default '{}'::jsonb,
  station_id uuid references public.stations (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (profile_id)
);

create index if not exists staff_profiles_station_id_idx
  on public.staff_profiles (station_id);

create table if not exists public.batteries (
  id uuid primary key default extensions.gen_random_uuid(),
  battery_code text not null unique,
  bike_id text references public.bikes (id) on delete set null,
  station_id uuid references public.stations (id) on delete set null,
  status text not null default 'available'
    check (status in ('available', 'in_use', 'charging', 'maintenance', 'retired', 'lost')),
  charge_level numeric(5, 2) check (charge_level is null or (charge_level >= 0 and charge_level <= 100)),
  charge_cycles integer not null default 0 check (charge_cycles >= 0),
  state_of_health numeric(5, 2) check (state_of_health is null or (state_of_health >= 0 and state_of_health <= 100)),
  last_inspection_date date,
  health_history text,
  charging_slot_id text,
  voltage numeric(8, 2),
  current_amp numeric(8, 2),
  temperature_c numeric(5, 2),
  retirement_plan text,
  abnormal_flag boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists batteries_bike_id_idx
  on public.batteries (bike_id);

create index if not exists batteries_station_id_idx
  on public.batteries (station_id);

alter table public.bikes
  add column if not exists current_battery_id uuid references public.batteries (id) on delete set null;

create index if not exists bikes_current_battery_id_idx
  on public.bikes (current_battery_id);

alter table public.rental_transactions
  add column if not exists start_station_id uuid references public.stations (id) on delete set null,
  add column if not exists return_station_id uuid references public.stations (id) on delete set null,
  add column if not exists rental_status text not null default 'completed'
    check (rental_status in ('reserved', 'checked_out', 'in_use', 'completed', 'cancelled', 'disputed')),
  add column if not exists service_fee numeric(10, 2) check (service_fee is null or service_fee >= 0),
  add column if not exists route_distance_km numeric(10, 2) check (route_distance_km is null or route_distance_km >= 0),
  add column if not exists photo_evidence_url text,
  add column if not exists source_system text not null default 'app'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  add column if not exists fallback_form_id text,
  add column if not exists import_batch_id uuid,
  add column if not exists entered_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  add column if not exists reconciled_at timestamptz;

update public.rental_transactions
set
  service_fee = coalesce(service_fee, total_cost),
  route_distance_km = coalesce(route_distance_km, distance_km)
where service_fee is null or route_distance_km is null;

create index if not exists rental_transactions_start_station_id_idx
  on public.rental_transactions (start_station_id);

create index if not exists rental_transactions_return_station_id_idx
  on public.rental_transactions (return_station_id);

create index if not exists rental_transactions_entered_by_staff_id_idx
  on public.rental_transactions (entered_by_staff_id);

create table if not exists public.payments (
  id uuid primary key default extensions.gen_random_uuid(),
  rental_transaction_id uuid references public.rental_transactions (id) on delete set null,
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency_code text not null default 'THB' check (currency_code ~ '^[A-Z]{3}$'),
  payment_method text not null
    check (payment_method in ('promptpay', 'thai_qr', 'gateway', 'credit_card', 'cash', 'wallet', 'manual')),
  payment_reference text,
  payment_time timestamptz,
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'verified', 'failed', 'refunded', 'cancelled')),
  evidence_file_url text,
  coupon_id uuid,
  reconciliation_status text not null default 'unreconciled'
    check (reconciliation_status in ('unreconciled', 'matched', 'exception', 'reconciled')),
  source_system text not null default 'app'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  fallback_form_id text,
  import_batch_id uuid,
  entered_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists payments_rental_transaction_id_idx
  on public.payments (rental_transaction_id);

create index if not exists payments_wallet_transaction_id_idx
  on public.payments (wallet_transaction_id);

create index if not exists payments_profile_id_idx
  on public.payments (profile_id);

alter table public.rental_transactions
  add column if not exists payment_id uuid references public.payments (id) on delete set null;

create index if not exists rental_transactions_payment_id_idx
  on public.rental_transactions (payment_id);

create table if not exists public.attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  entity_table text not null
    check (entity_table in ('rental_transactions', 'payments', 'maintenance_logs', 'incidents', 'audit_logs', 'batteries', 'bikes', 'stations')),
  entity_id text not null,
  attachment_type text not null
    check (attachment_type in ('photo_evidence', 'payment_slip', 'document', 'inspection_photo', 'damage_photo', 'other')),
  file_url text not null,
  storage_bucket text,
  storage_path text,
  content_type text,
  uploaded_by_profile_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists attachments_entity_idx
  on public.attachments (entity_table, entity_id);

create index if not exists attachments_uploaded_by_profile_id_idx
  on public.attachments (uploaded_by_profile_id);

create table if not exists public.asset_inventory (
  id uuid primary key default extensions.gen_random_uuid(),
  item_description text not null,
  quantity integer not null default 0 check (quantity >= 0),
  station_id uuid references public.stations (id) on delete set null,
  procurement_date date,
  warranty_status text not null default 'unknown'
    check (warranty_status in ('active', 'expired', 'none', 'unknown')),
  maintenance_period text,
  stock_level integer not null default 0 check (stock_level >= 0),
  minimum_threshold integer not null default 0 check (minimum_threshold >= 0),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists asset_inventory_station_id_idx
  on public.asset_inventory (station_id);

create table if not exists public.maintenance_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  bike_id text references public.bikes (id) on delete set null,
  asset_id uuid references public.asset_inventory (id) on delete set null,
  repair_type text not null check (repair_type in ('pm', 'cm', 'inspection', 'battery', 'other')),
  date_reported timestamptz not null default timezone('utc'::text, now()),
  date_finished timestamptz,
  parts_used jsonb not null default '[]'::jsonb,
  technician_staff_id uuid references public.staff_profiles (id) on delete set null,
  post_repair_status text
    check (post_repair_status is null or post_repair_status in ('ready', 'needs_follow_up', 'out_of_service')),
  next_service_schedule date,
  quality_check_status text not null default 'pending'
    check (quality_check_status in ('pending', 'passed', 'failed', 'not_required')),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  source_system text not null default 'admin_dashboard'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  fallback_form_id text,
  import_batch_id uuid,
  entered_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists maintenance_logs_bike_id_idx
  on public.maintenance_logs (bike_id);

create index if not exists maintenance_logs_asset_id_idx
  on public.maintenance_logs (asset_id);

create index if not exists maintenance_logs_technician_staff_id_idx
  on public.maintenance_logs (technician_staff_id);

create table if not exists public.incidents (
  id uuid primary key default extensions.gen_random_uuid(),
  rental_transaction_id uuid references public.rental_transactions (id) on delete set null,
  bike_id text references public.bikes (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  incident_type text not null
    check (incident_type in ('accident', 'damage', 'loss', 'breakdown', 'complaint', 'other')),
  description text,
  status text not null default 'open'
    check (status in ('open', 'investigating', 'resolved', 'closed')),
  resolution_status text not null default 'pending'
    check (resolution_status in ('pending', 'resolved', 'escalated', 'not_required')),
  assigned_staff_id uuid references public.staff_profiles (id) on delete set null,
  source_system text not null default 'admin_dashboard'
    check (source_system in ('app', 'admin_dashboard', 'google_form', 'manual_import', 'system')),
  fallback_form_id text,
  import_batch_id uuid,
  entered_by_staff_id uuid references public.staff_profiles (id) on delete set null,
  reconciled_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists incidents_rental_transaction_id_idx
  on public.incidents (rental_transaction_id);

create index if not exists incidents_bike_id_idx
  on public.incidents (bike_id);

create index if not exists incidents_profile_id_idx
  on public.incidents (profile_id);

create table if not exists public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  actor_staff_id uuid references public.staff_profiles (id) on delete set null,
  user_role text,
  action_performed text not null,
  entity_table text,
  entity_id text,
  data_changed jsonb not null default '{}'::jsonb,
  device_location text,
  kpi_achievement numeric(5, 2),
  evidence_attachment_id uuid references public.attachments (id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists audit_logs_actor_profile_id_idx
  on public.audit_logs (actor_profile_id);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_table, entity_id);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_stations_updated_at'
      and tgrelid = 'public.stations'::regclass
  ) then
    create trigger handle_stations_updated_at
      before update on public.stations
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_staff_profiles_updated_at'
      and tgrelid = 'public.staff_profiles'::regclass
  ) then
    create trigger handle_staff_profiles_updated_at
      before update on public.staff_profiles
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_batteries_updated_at'
      and tgrelid = 'public.batteries'::regclass
  ) then
    create trigger handle_batteries_updated_at
      before update on public.batteries
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_payments_updated_at'
      and tgrelid = 'public.payments'::regclass
  ) then
    create trigger handle_payments_updated_at
      before update on public.payments
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_asset_inventory_updated_at'
      and tgrelid = 'public.asset_inventory'::regclass
  ) then
    create trigger handle_asset_inventory_updated_at
      before update on public.asset_inventory
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_maintenance_logs_updated_at'
      and tgrelid = 'public.maintenance_logs'::regclass
  ) then
    create trigger handle_maintenance_logs_updated_at
      before update on public.maintenance_logs
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'handle_incidents_updated_at'
      and tgrelid = 'public.incidents'::regclass
  ) then
    create trigger handle_incidents_updated_at
      before update on public.incidents
      for each row execute procedure extensions.moddatetime(updated_at);
  end if;
end $$;

alter table public.stations enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.batteries enable row level security;
alter table public.payments enable row level security;
alter table public.attachments enable row level security;
alter table public.asset_inventory enable row level security;
alter table public.maintenance_logs enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "stations_select_authenticated" on public.stations;
create policy "stations_select_authenticated"
on public.stations
for select
to authenticated
using (true);

drop policy if exists "stations_admin_insert" on public.stations;
create policy "stations_admin_insert"
on public.stations
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "stations_admin_update" on public.stations;
create policy "stations_admin_update"
on public.stations
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "stations_admin_delete" on public.stations;
create policy "stations_admin_delete"
on public.stations
for delete
to authenticated
using (private.is_admin());

drop policy if exists "staff_profiles_select_own_or_admin" on public.staff_profiles;
create policy "staff_profiles_select_own_or_admin"
on public.staff_profiles
for select
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "staff_profiles_admin_insert" on public.staff_profiles;
create policy "staff_profiles_admin_insert"
on public.staff_profiles
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "staff_profiles_admin_update" on public.staff_profiles;
create policy "staff_profiles_admin_update"
on public.staff_profiles
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "staff_profiles_admin_delete" on public.staff_profiles;
create policy "staff_profiles_admin_delete"
on public.staff_profiles
for delete
to authenticated
using (private.is_admin());

drop policy if exists "batteries_admin_select" on public.batteries;
create policy "batteries_admin_select"
on public.batteries
for select
to authenticated
using (private.is_admin());

drop policy if exists "batteries_admin_insert" on public.batteries;
create policy "batteries_admin_insert"
on public.batteries
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "batteries_admin_update" on public.batteries;
create policy "batteries_admin_update"
on public.batteries
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "batteries_admin_delete" on public.batteries;
create policy "batteries_admin_delete"
on public.batteries
for delete
to authenticated
using (private.is_admin());

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin"
on public.payments
for select
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "payments_admin_insert" on public.payments;
create policy "payments_admin_insert"
on public.payments
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update"
on public.payments
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "payments_admin_delete" on public.payments;
create policy "payments_admin_delete"
on public.payments
for delete
to authenticated
using (private.is_admin());

drop policy if exists "attachments_select_own_or_admin" on public.attachments;
create policy "attachments_select_own_or_admin"
on public.attachments
for select
to authenticated
using (uploaded_by_profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "attachments_insert_own_or_admin" on public.attachments;
create policy "attachments_insert_own_or_admin"
on public.attachments
for insert
to authenticated
with check (
  private.is_admin()
  or uploaded_by_profile_id is null
  or uploaded_by_profile_id = (select auth.uid())
);

drop policy if exists "attachments_admin_update" on public.attachments;
create policy "attachments_admin_update"
on public.attachments
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "attachments_admin_delete" on public.attachments;
create policy "attachments_admin_delete"
on public.attachments
for delete
to authenticated
using (private.is_admin());

drop policy if exists "asset_inventory_admin_select" on public.asset_inventory;
create policy "asset_inventory_admin_select"
on public.asset_inventory
for select
to authenticated
using (private.is_admin());

drop policy if exists "asset_inventory_admin_insert" on public.asset_inventory;
create policy "asset_inventory_admin_insert"
on public.asset_inventory
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "asset_inventory_admin_update" on public.asset_inventory;
create policy "asset_inventory_admin_update"
on public.asset_inventory
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "asset_inventory_admin_delete" on public.asset_inventory;
create policy "asset_inventory_admin_delete"
on public.asset_inventory
for delete
to authenticated
using (private.is_admin());

drop policy if exists "maintenance_logs_admin_select" on public.maintenance_logs;
create policy "maintenance_logs_admin_select"
on public.maintenance_logs
for select
to authenticated
using (private.is_admin());

drop policy if exists "maintenance_logs_admin_insert" on public.maintenance_logs;
create policy "maintenance_logs_admin_insert"
on public.maintenance_logs
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "maintenance_logs_admin_update" on public.maintenance_logs;
create policy "maintenance_logs_admin_update"
on public.maintenance_logs
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "maintenance_logs_admin_delete" on public.maintenance_logs;
create policy "maintenance_logs_admin_delete"
on public.maintenance_logs
for delete
to authenticated
using (private.is_admin());

drop policy if exists "incidents_select_own_or_admin" on public.incidents;
create policy "incidents_select_own_or_admin"
on public.incidents
for select
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "incidents_admin_insert" on public.incidents;
create policy "incidents_admin_insert"
on public.incidents
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "incidents_admin_update" on public.incidents;
create policy "incidents_admin_update"
on public.incidents
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "incidents_admin_delete" on public.incidents;
create policy "incidents_admin_delete"
on public.incidents
for delete
to authenticated
using (private.is_admin());

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
on public.audit_logs
for select
to authenticated
using (private.is_admin());

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
on public.audit_logs
for insert
to authenticated
with check (private.is_admin());
