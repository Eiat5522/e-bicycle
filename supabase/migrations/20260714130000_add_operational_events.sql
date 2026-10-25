create table if not exists public.operational_events (
  id uuid primary key default extensions.gen_random_uuid(),
  rental_transaction_id uuid references public.rental_transactions (id) on delete set null,
  bike_id text references public.bikes (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  staff_id uuid references public.staff_profiles (id) on delete set null,
  event_type text not null
    check (event_type in ('unlock', 'parking', 'return', 'photo_proof', 'gps_report', 'checkpoint', 'other')),
  gps_location extensions.geography(Point, 4326),
  photo_proof_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists operational_events_rental_transaction_id_idx
  on public.operational_events (rental_transaction_id);

create index if not exists operational_events_bike_id_created_at_idx
  on public.operational_events (bike_id, created_at desc);

create index if not exists operational_events_profile_id_idx
  on public.operational_events (profile_id);

create index if not exists operational_events_event_type_idx
  on public.operational_events (event_type);

create index if not exists operational_events_created_at_idx
  on public.operational_events (created_at desc);

alter table public.operational_events enable row level security;

drop policy if exists "operational_events_select_own_or_admin" on public.operational_events;
create policy "operational_events_select_own_or_admin"
on public.operational_events
for select
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "operational_events_insert_own_or_admin" on public.operational_events;
create policy "operational_events_insert_own_or_admin"
on public.operational_events
for insert
to authenticated
with check (
  private.is_admin()
  or (profile_id is not null and profile_id = (select auth.uid()))
);

drop policy if exists "operational_events_admin_update" on public.operational_events;
create policy "operational_events_admin_update"
on public.operational_events
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "operational_events_admin_delete" on public.operational_events;
create policy "operational_events_admin_delete"
on public.operational_events
for delete
to authenticated
using (private.is_admin());
