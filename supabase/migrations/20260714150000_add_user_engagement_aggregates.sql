create table if not exists public.user_engagement_aggregates (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  eco_points integer not null default 0 check (eco_points >= 0),
  carbon_reduced_total_kg numeric(12, 2) not null default 0 check (carbon_reduced_total_kg >= 0),
  calories_burned_total integer not null default 0 check (calories_burned_total >= 0),
  distance_accumulated_km numeric(12, 2) not null default 0 check (distance_accumulated_km >= 0),
  last_updated timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (profile_id)
);

create index if not exists user_engagement_aggregates_eco_points_idx
  on public.user_engagement_aggregates (eco_points desc);

create index if not exists user_engagement_aggregates_distance_idx
  on public.user_engagement_aggregates (distance_accumulated_km desc);

alter table public.user_engagement_aggregates enable row level security;

drop policy if exists "user_engagement_aggregates_select_own_or_admin" on public.user_engagement_aggregates;
create policy "user_engagement_aggregates_select_own_or_admin"
on public.user_engagement_aggregates
for select
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "user_engagement_aggregates_insert_own_or_admin" on public.user_engagement_aggregates;
create policy "user_engagement_aggregates_insert_own_or_admin"
on public.user_engagement_aggregates
for insert
to authenticated
with check (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "user_engagement_aggregates_update_own_or_admin" on public.user_engagement_aggregates;
create policy "user_engagement_aggregates_update_own_or_admin"
on public.user_engagement_aggregates
for update
to authenticated
using (profile_id = (select auth.uid()) or private.is_admin())
with check (profile_id = (select auth.uid()) or private.is_admin());

drop policy if exists "user_engagement_aggregates_admin_delete" on public.user_engagement_aggregates;
create policy "user_engagement_aggregates_admin_delete"
on public.user_engagement_aggregates
for delete
to authenticated
using (private.is_admin());
