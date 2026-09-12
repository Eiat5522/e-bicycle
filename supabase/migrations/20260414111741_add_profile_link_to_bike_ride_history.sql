alter table public.bike_ride_history
  add column if not exists profile_id uuid references public.profiles (id) on delete set null;

create index if not exists bike_ride_history_profile_id_completed_at_idx
  on public.bike_ride_history (profile_id, completed_at desc);

drop policy if exists "bike_ride_history_select_own" on public.bike_ride_history;
create policy "bike_ride_history_select_own"
on public.bike_ride_history
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = profile_id);
