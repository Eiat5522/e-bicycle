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
  rate_per_minute,
  status,
  active_rider_id,
  location,
  latitude,
  longitude,
  last_reported_at
)
values
  ('G-104', 'Glide Pro X', 'Pro', 45, 25, '฿1.20 / 10 min', 0.1200, 'available', null, 'Siam Square', 13.7466, 100.5328, '2026-04-06T08:55:00Z'),
  ('G-205', 'Glide City', 'City', 31, 22, '฿0.90 / 10 min', 0.0900, 'in_use', null, 'อโศก Interchange', 13.7372, 100.5606, '2026-04-06T08:56:00Z'),
  ('G-318', 'Glide Lite', 'Urban', 28, 20, '฿0.80 / 10 min', 0.0800, 'available', null, 'Ari Soi 1', 13.7797, 100.5446, '2026-04-06T08:58:00Z'),
  ('G-412', 'Glide Cargo', 'Cargo', 36, 20, '฿1.40 / 10 min', 0.1400, 'available', null, 'Lumphini Park West Gate', 13.7305, 100.5418, '2026-04-06T08:57:00Z'),
  ('G-509', 'Glide Metro', 'City', 33, 23, '฿1.00 / 10 min', 0.1000, 'available', null, 'Silom Complex', 13.7286, 100.5345, '2026-04-06T08:54:00Z'),
  ('G-620', 'Glide Street+', 'Pro', 47, 25, '฿1.20 / 10 min', 0.1200, 'available', null, 'Phrom Phong BTS', 13.7301, 100.5697, '2026-04-06T08:59:00Z')
on conflict (id) do update
set
  model = excluded.model,
  ride_class = excluded.ride_class,
  estimated_range_km = excluded.estimated_range_km,
  top_speed_kmh = excluded.top_speed_kmh,
  pricing_label = excluded.pricing_label,
  rate_per_minute = excluded.rate_per_minute,
  status = excluded.status,
  active_rider_id = excluded.active_rider_id,
  location = excluded.location,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  last_reported_at = excluded.last_reported_at;

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
values
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'maya@glide.local',
    extensions.crypt('glide-rider-123', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Maya"}',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'niran@glide.local',
    extensions.crypt('glide-rider-123', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Niran"}',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'suda@glide.local',
    extensions.crypt('glide-rider-123', extensions.gen_salt('bf')),
    timezone('utc'::text, now()),
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Suda"}',
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
  '33333333-aaaa-4444-bbbb-111111111111',
  '33333333-3333-3333-3333-333333333333',
  jsonb_build_object(
    'sub',
    '33333333-3333-3333-3333-333333333333',
    'email',
    'maya@glide.local'
  ),
  'email',
  '33333333-3333-3333-3333-333333333333',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
where not exists (
  select 1
  from auth.identities
  where provider = 'email'
    and provider_id = '33333333-3333-3333-3333-333333333333'
);

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
  '44444444-aaaa-4444-bbbb-222222222222',
  '44444444-4444-4444-4444-444444444444',
  jsonb_build_object(
    'sub',
    '44444444-4444-4444-4444-444444444444',
    'email',
    'niran@glide.local'
  ),
  'email',
  '44444444-4444-4444-4444-444444444444',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
where not exists (
  select 1
  from auth.identities
  where provider = 'email'
    and provider_id = '44444444-4444-4444-4444-444444444444'
);

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
  '55555555-aaaa-4444-bbbb-333333333333',
  '55555555-5555-5555-5555-555555555555',
  jsonb_build_object(
    'sub',
    '55555555-5555-5555-5555-555555555555',
    'email',
    'suda@glide.local'
  ),
  'email',
  '55555555-5555-5555-5555-555555555555',
  timezone('utc'::text, now()),
  timezone('utc'::text, now()),
  timezone('utc'::text, now())
where not exists (
  select 1
  from auth.identities
  where provider = 'email'
    and provider_id = '55555555-5555-5555-5555-555555555555'
);

insert into public.profiles (
  id,
  first_name,
  is_admin
)
values
  ('33333333-3333-3333-3333-333333333333', 'Maya', false),
  ('44444444-4444-4444-4444-444444444444', 'Niran', false),
  ('55555555-5555-5555-5555-555555555555', 'Suda', false)
on conflict (id) do update
set
  first_name = excluded.first_name,
  is_admin = excluded.is_admin;

update public.bikes
set
  active_rider_id = '33333333-3333-3333-3333-333333333333',
  active_ride_started_at = '2026-04-06T08:43:30Z',
  active_ride_start_location = location
where id = 'G-205';

insert into public.wallets (
  id,
  balance,
  points,
  payment_methods
)
values
  ('33333333-3333-3333-3333-333333333333', 18.75, 82, array['Visa **** 4242']::text[]),
  ('44444444-4444-4444-4444-444444444444', 11.40, 54, array['Visa **** 0188']::text[]),
  ('55555555-5555-5555-5555-555555555555', 27.20, 118, array['Mastercard **** 8181']::text[])
on conflict (id) do update
set
  balance = excluded.balance,
  points = excluded.points,
  payment_methods = excluded.payment_methods;

insert into public.wallet_transactions (
  id,
  wallet_id,
  type,
  title,
  subtitle,
  amount,
  created_at
)
values
  (
    '63333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333333',
    'ride',
    'Benjakitti commute',
    'Apr 4, 2026 - Charged to Visa **** 4242',
    -4.80,
    '2026-04-04T10:41:00Z'
  ),
  (
    '63333333-3333-3333-3333-333333333332',
    '44444444-4444-4444-4444-444444444444',
    'ride',
    'Silom lunch loop',
    'Apr 2, 2026 - Charged to Visa **** 0188',
    -3.95,
    '2026-04-02T05:50:00Z'
  ),
  (
    '63333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    'ride',
    'Victory Monument drop-off',
    'Mar 31, 2026 - Charged to Mastercard **** 8181',
    -5.30,
    '2026-03-31T11:38:00Z'
  )
on conflict (id) do update
set
  wallet_id = excluded.wallet_id,
  type = excluded.type,
  title = excluded.title,
  subtitle = excluded.subtitle,
  amount = excluded.amount,
  created_at = excluded.created_at;

insert into public.bike_ride_history (
  id,
  profile_id,
  bike_id,
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
  checkpoints
)
values
  (
    '73333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333333',
    'G-205',
    '2026-04-04T10:15:00Z',
    '2026-04-04T10:41:00Z',
    1560,
    3.4,
    4.8,
    0.1846,
    26,
    'THB',
    '63333333-3333-3333-3333-333333333331',
    'ceil_minutes_v1',
    0.9,
    'อโศก Interchange',
    'Benjakitti Park',
    'อโศก Interchange to Benjakitti Park',
    'Charged to Visa **** 4242',
    '[
      {"latitude":13.7372,"longitude":100.5606},
      {"latitude":13.7349,"longitude":100.5585},
      {"latitude":13.7318,"longitude":100.5552},
      {"latitude":13.7288,"longitude":100.5521},
      {"latitude":13.7261,"longitude":100.5486},
      {"latitude":13.7245,"longitude":100.5472}
    ]'::jsonb,
    '[
      {"id":"ride-history-1-start","label":"Unlock","description":"Bike unlocked near the BTS exit.","coordinates":{"latitude":13.7372,"longitude":100.5606},"elapsedSec":0},
      {"id":"ride-history-1-mid","label":"Queen Sirikit turn","description":"Joined the park connector lane.","coordinates":{"latitude":13.7288,"longitude":100.5521},"elapsedSec":820},
      {"id":"ride-history-1-end","label":"Drop-off","description":"Ride ended at the park gate station.","coordinates":{"latitude":13.7245,"longitude":100.5472},"elapsedSec":1560}
    ]'::jsonb
  ),
  (
    '73333333-3333-3333-3333-333333333332',
    '44444444-4444-4444-4444-444444444444',
    'G-509',
    '2026-04-02T05:30:00Z',
    '2026-04-02T05:50:00Z',
    1200,
    2.6,
    3.95,
    0.1975,
    20,
    'THB',
    '63333333-3333-3333-3333-333333333332',
    'ceil_minutes_v1',
    0.6,
    'Silom Complex',
    'Lumphini Park West Gate',
    'Silom lunch loop',
    'Charged to Visa **** 0188',
    '[
      {"latitude":13.7286,"longitude":100.5345},
      {"latitude":13.7294,"longitude":100.5364},
      {"latitude":13.7306,"longitude":100.5392},
      {"latitude":13.7321,"longitude":100.5415},
      {"latitude":13.7336,"longitude":100.5438},
      {"latitude":13.7352,"longitude":100.5457}
    ]'::jsonb,
    '[
      {"id":"ride-history-2-start","label":"Unlock","description":"Started outside Silom Complex.","coordinates":{"latitude":13.7286,"longitude":100.5345},"elapsedSec":0},
      {"id":"ride-history-2-mid","label":"Rama IV crossing","description":"Crossed into the protected lane segment.","coordinates":{"latitude":13.7306,"longitude":100.5392},"elapsedSec":560},
      {"id":"ride-history-2-end","label":"Drop-off","description":"Ended close to the west gate bike rack.","coordinates":{"latitude":13.7352,"longitude":100.5457},"elapsedSec":1200}
    ]'::jsonb
  ),
  (
    '73333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    'G-318',
    '2026-03-31T11:05:00Z',
    '2026-03-31T11:38:00Z',
    1980,
    4.1,
    5.3,
    0.1606,
    33,
    'THB',
    '63333333-3333-3333-3333-333333333333',
    'ceil_minutes_v1',
    1.1,
    'Ari Soi 1',
    'Victory Monument',
    'Ari Soi 1 to Victory Monument',
    'Charged to Mastercard **** 8181',
    '[
      {"latitude":13.7797,"longitude":100.5446},
      {"latitude":13.7779,"longitude":100.5431},
      {"latitude":13.7758,"longitude":100.5418},
      {"latitude":13.7734,"longitude":100.5408},
      {"latitude":13.7706,"longitude":100.5399},
      {"latitude":13.7678,"longitude":100.5388}
    ]'::jsonb,
    '[
      {"id":"ride-history-3-start","label":"Unlock","description":"Started from the Ari station cluster.","coordinates":{"latitude":13.7797,"longitude":100.5446},"elapsedSec":0},
      {"id":"ride-history-3-mid","label":"Phaya Thai link","description":"Passed the dedicated connector lane.","coordinates":{"latitude":13.7734,"longitude":100.5408},"elapsedSec":1040},
      {"id":"ride-history-3-end","label":"Drop-off","description":"Ended near the Victory Monument ring.","coordinates":{"latitude":13.7678,"longitude":100.5388},"elapsedSec":1980}
    ]'::jsonb
  )
on conflict (id) do update
set
  profile_id = excluded.profile_id,
  bike_id = excluded.bike_id,
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
  checkpoints = excluded.checkpoints;
