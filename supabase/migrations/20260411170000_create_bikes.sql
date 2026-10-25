create type public.bike_status as enum (
  'available',
  'reserved',
  'in_use',
  'maintenance'
);

create table if not exists public.bikes (
  id text primary key,
  model text not null,
  ride_class text,
  estimated_range_km double precision not null,
  top_speed_kmh integer not null,
  pricing_label text not null,
  status public.bike_status not null default 'available',
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  last_reported_at timestamptz not null default timezone('utc'::text, now()),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.bikes enable row level security;

drop policy if exists "bikes_select_authenticated" on public.bikes;
create policy "bikes_select_authenticated"
on public.bikes
for select
to authenticated
using (true);

drop trigger if exists handle_bikes_updated_at on public.bikes;
create trigger handle_bikes_updated_at
  before update on public.bikes
  for each row execute procedure extensions.moddatetime(updated_at);
