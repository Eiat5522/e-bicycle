create type public.bike_status as enum (
  'available',
  'reserved',
  'in_use',
  'maintenance'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create schema if not exists private;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'first_name', ''),
      split_part(new.email, '@', 1),
      'Rider'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create table public.bikes (
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
  last_reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bikes enable row level security;

create policy "Authenticated users can view bikes"
  on public.bikes
  for select
  to authenticated
  using (true);
