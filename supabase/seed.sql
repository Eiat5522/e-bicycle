insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'admin@glide.local',
  extensions.crypt('glide-admin-123', extensions.gen_salt('bf')),
  timezone('utc'::text, now()),
  '{"provider":"email","providers":["email"]}',
  '{"first_name":"Test Admin"}',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  '',
  '',
  '',
  ''
)
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  jsonb_build_object(
    'sub',
    '11111111-1111-1111-1111-111111111111',
    'email',
    'admin@glide.local'
  ),
  'email',
  '11111111-1111-1111-1111-111111111111',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
where not exists (
  select 1
  from auth.identities
  where provider = 'email'
    and provider_id = '11111111-1111-1111-1111-111111111111'
);

insert into public.profiles (
  id,
  first_name,
  is_admin
)
values (
  '11111111-1111-1111-1111-111111111111',
  'Test Admin',
  true
)
on conflict (id) do update
set
  first_name = excluded.first_name,
  is_admin = excluded.is_admin;

insert into public.wallets (id)
values ('11111111-1111-1111-1111-111111111111')
on conflict (id) do nothing;

insert into public.bikes (
  id,
  model,
  ride_class,
  estimated_range_km,
  top_speed_kmh,
  pricing_label,
  status,
  location,
  latitude,
  longitude,
  last_reported_at
)
values
  ('G-104', 'Glide Pro X', 'Pro', 45, 25, '$1.20 / 10 min', 'available', 'Siam Square', 13.7466, 100.5328, '2026-04-06T08:55:00Z'),
  ('G-205', 'Glide City', 'City', 31, 22, '$0.90 / 10 min', 'in_use', 'อโศก Interchange', 13.7372, 100.5606, '2026-04-06T08:56:00Z'),
  ('G-318', 'Glide Lite', 'Urban', 28, 20, '$0.80 / 10 min', 'available', 'Ari Soi 1', 13.7797, 100.5446, '2026-04-06T08:58:00Z'),
  ('G-412', 'Glide Cargo', 'Cargo', 36, 20, '$1.40 / 10 min', 'available', 'Lumphini Park West Gate', 13.7305, 100.5418, '2026-04-06T08:57:00Z'),
  ('G-509', 'Glide Metro', 'City', 33, 23, '$1.00 / 10 min', 'available', 'Silom Complex', 13.7286, 100.5345, '2026-04-06T08:54:00Z'),
  ('G-620', 'Glide Street+', 'Pro', 47, 25, '$1.20 / 10 min', 'available', 'Phrom Phong BTS', 13.7301, 100.5697, '2026-04-06T08:59:00Z')
on conflict (id) do update
set
  model = excluded.model,
  ride_class = excluded.ride_class,
  estimated_range_km = excluded.estimated_range_km,
  top_speed_kmh = excluded.top_speed_kmh,
  pricing_label = excluded.pricing_label,
  status = excluded.status,
  location = excluded.location,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  last_reported_at = excluded.last_reported_at;
