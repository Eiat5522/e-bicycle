alter table public.bikes
  add column if not exists active_rider_id uuid references public.profiles (id) on delete set null;

create index if not exists bikes_active_rider_id_idx
  on public.bikes (active_rider_id);
