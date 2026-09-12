alter table public.bikes
  add column if not exists image_url text;

drop policy if exists "bikes_admin_insert" on public.bikes;
create policy "bikes_admin_insert"
on public.bikes
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "bikes_admin_update" on public.bikes;
create policy "bikes_admin_update"
on public.bikes
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "bikes_admin_delete" on public.bikes;
create policy "bikes_admin_delete"
on public.bikes
for delete
to authenticated
using (private.is_admin());

create table if not exists public.bike_ride_history (
  id uuid primary key default extensions.gen_random_uuid(),
  bike_id text not null references public.bikes (id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  duration_sec integer not null check (duration_sec >= 0),
  distance_km numeric(10, 2) not null check (distance_km >= 0),
  total_cost numeric(10, 2) not null,
  co2_saved_kg numeric(10, 2) not null default 0,
  start_location text not null,
  end_location text not null,
  route_label text not null,
  payment_label text not null,
  route jsonb not null default '[]'::jsonb,
  checkpoints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists bike_ride_history_bike_id_completed_at_idx
  on public.bike_ride_history (bike_id, completed_at desc);

alter table public.bike_ride_history enable row level security;

drop policy if exists "bike_ride_history_admin_select" on public.bike_ride_history;
create policy "bike_ride_history_admin_select"
on public.bike_ride_history
for select
to authenticated
using (private.is_admin());

drop policy if exists "bike_ride_history_admin_insert" on public.bike_ride_history;
create policy "bike_ride_history_admin_insert"
on public.bike_ride_history
for insert
to authenticated
with check (private.is_admin());

drop policy if exists "bike_ride_history_admin_update" on public.bike_ride_history;
create policy "bike_ride_history_admin_update"
on public.bike_ride_history
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

drop policy if exists "bike_ride_history_admin_delete" on public.bike_ride_history;
create policy "bike_ride_history_admin_delete"
on public.bike_ride_history
for delete
to authenticated
using (private.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'bike-images',
  'bike-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bike_images_public_read" on storage.objects;
create policy "bike_images_public_read"
on storage.objects
for select
to public
using (bucket_id = 'bike-images');

drop policy if exists "bike_images_admin_insert" on storage.objects;
create policy "bike_images_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bike-images'
  and private.is_admin()
);

drop policy if exists "bike_images_admin_update" on storage.objects;
create policy "bike_images_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bike-images'
  and private.is_admin()
)
with check (
  bucket_id = 'bike-images'
  and private.is_admin()
);

drop policy if exists "bike_images_admin_delete" on storage.objects;
create policy "bike_images_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bike-images'
  and private.is_admin()
);
