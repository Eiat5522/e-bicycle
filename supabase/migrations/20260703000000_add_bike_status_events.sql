create table if not exists public.bike_status_events (
  id uuid primary key default extensions.gen_random_uuid(),
  bike_id text not null references public.bikes (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  from_status public.bike_status not null,
  to_status public.bike_status not null,
  transition_kind text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists bike_status_events_bike_id_created_at_idx
  on public.bike_status_events (bike_id, created_at desc);

alter table public.bike_status_events enable row level security;

drop policy if exists "bike_status_events_admin_select" on public.bike_status_events;
create policy "bike_status_events_admin_select"
on public.bike_status_events
for select
to authenticated
using (private.is_admin());

drop policy if exists "bike_status_events_admin_insert" on public.bike_status_events;
create policy "bike_status_events_admin_insert"
on public.bike_status_events
for insert
to authenticated
with check (private.is_admin());
