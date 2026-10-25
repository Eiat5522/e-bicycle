create table if not exists public.rental_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  bike_id text not null references public.bikes (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  distance_km numeric(10, 2) not null check (distance_km >= 0),
  total_cost numeric(10, 2) not null,
  rate_per_minute numeric(10, 4) not null default 0 check (rate_per_minute >= 0),
  billable_minutes integer not null default 0 check (billable_minutes >= 0),
  currency_code text not null default 'THB' check (currency_code ~ '^[A-Z]{3}$'),
  wallet_transaction_id uuid references public.wallet_transactions (id) on delete set null,
  fare_calculation_method text not null default 'ceil_minutes_v1',
  co2_saved_kg numeric(10, 2) not null default 0,
  start_location text not null,
  end_location text not null,
  route_label text not null,
  payment_label text not null,
  route jsonb not null default '[]'::jsonb,
  checkpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

insert into public.rental_transactions (
  id,
  bike_id,
  profile_id,
  started_at,
  completed_at,
  duration_sec,
  distance_km,
  total_cost,
  rate_per_minute,
  billable_minutes,
  currency_code,
  wallet_transaction_id,
  fare_calculation_method,
  co2_saved_kg,
  start_location,
  end_location,
  route_label,
  payment_label,
  route,
  checkpoints,
  created_at
)
select
  id,
  bike_id,
  profile_id,
  started_at,
  completed_at,
  duration_sec,
  distance_km,
  total_cost,
  rate_per_minute,
  billable_minutes,
  currency_code,
  wallet_transaction_id,
  fare_calculation_method,
  co2_saved_kg,
  start_location,
  end_location,
  route_label,
  payment_label,
  route,
  checkpoints,
  created_at
from public.bike_ride_history
on conflict (id) do update
set
  bike_id = excluded.bike_id,
  profile_id = excluded.profile_id,
  started_at = excluded.started_at,
  completed_at = excluded.completed_at,
  duration_sec = excluded.duration_sec,
  distance_km = excluded.distance_km,
  total_cost = excluded.total_cost,
  rate_per_minute = excluded.rate_per_minute,
  billable_minutes = excluded.billable_minutes,
  currency_code = excluded.currency_code,
  wallet_transaction_id = excluded.wallet_transaction_id,
  fare_calculation_method = excluded.fare_calculation_method,
  co2_saved_kg = excluded.co2_saved_kg,
  start_location = excluded.start_location,
  end_location = excluded.end_location,
  route_label = excluded.route_label,
  payment_label = excluded.payment_label,
  route = excluded.route,
  checkpoints = excluded.checkpoints,
  created_at = excluded.created_at;

create index if not exists rental_transactions_bike_id_completed_at_idx
  on public.rental_transactions (bike_id, completed_at desc);

create index if not exists rental_transactions_profile_id_completed_at_idx
  on public.rental_transactions (profile_id, completed_at desc);

create index if not exists rental_transactions_wallet_transaction_id_idx
  on public.rental_transactions (wallet_transaction_id);

alter table public.rental_transactions enable row level security;

drop policy if exists "rental_transactions_admin_select" on public.rental_transactions;
create policy "rental_transactions_admin_select"
on public.rental_transactions
for select
to authenticated
using (private.is_admin());

drop policy if exists "rental_transactions_admin_insert" on public.rental_transactions;
create policy "rental_transactions_admin_insert"
on public.rental_transactions
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "rental_transactions_admin_update" on public.rental_transactions;
create policy "rental_transactions_admin_update"
on public.rental_transactions
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "rental_transactions_admin_delete" on public.rental_transactions;
create policy "rental_transactions_admin_delete"
on public.rental_transactions
for delete
to authenticated
using (private.is_admin());

drop policy if exists "rental_transactions_select_own" on public.rental_transactions;
create policy "rental_transactions_select_own"
on public.rental_transactions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);

create or replace function private.sync_rental_transaction_from_bike_ride_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.rental_transactions
    where id = old.id;
    return old;
  end if;

  insert into public.rental_transactions (
    id,
    bike_id,
    profile_id,
    started_at,
    completed_at,
    duration_sec,
    distance_km,
    total_cost,
    rate_per_minute,
    billable_minutes,
    currency_code,
    wallet_transaction_id,
    fare_calculation_method,
    co2_saved_kg,
    start_location,
    end_location,
    route_label,
    payment_label,
    route,
    checkpoints,
    created_at
  )
  values (
    new.id,
    new.bike_id,
    new.profile_id,
    new.started_at,
    new.completed_at,
    new.duration_sec,
    new.distance_km,
    new.total_cost,
    new.rate_per_minute,
    new.billable_minutes,
    new.currency_code,
    new.wallet_transaction_id,
    new.fare_calculation_method,
    new.co2_saved_kg,
    new.start_location,
    new.end_location,
    new.route_label,
    new.payment_label,
    new.route,
    new.checkpoints,
    new.created_at
  )
  on conflict (id) do update
  set
    bike_id = excluded.bike_id,
    profile_id = excluded.profile_id,
    started_at = excluded.started_at,
    completed_at = excluded.completed_at,
    duration_sec = excluded.duration_sec,
    distance_km = excluded.distance_km,
    total_cost = excluded.total_cost,
    rate_per_minute = excluded.rate_per_minute,
    billable_minutes = excluded.billable_minutes,
    currency_code = excluded.currency_code,
    wallet_transaction_id = excluded.wallet_transaction_id,
    fare_calculation_method = excluded.fare_calculation_method,
    co2_saved_kg = excluded.co2_saved_kg,
    start_location = excluded.start_location,
    end_location = excluded.end_location,
    route_label = excluded.route_label,
    payment_label = excluded.payment_label,
    route = excluded.route,
    checkpoints = excluded.checkpoints,
    created_at = excluded.created_at;

  return new;
end;
$$;

drop trigger if exists sync_rental_transaction_from_bike_ride_history on public.bike_ride_history;
create trigger sync_rental_transaction_from_bike_ride_history
  after insert or update or delete on public.bike_ride_history
  for each row execute function private.sync_rental_transaction_from_bike_ride_history();
