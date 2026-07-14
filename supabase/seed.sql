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

-- --------------------------------------------------
-- Operational seed data for Phase-D tables
-- --------------------------------------------------

-- Stations
insert into public.stations (id, station_code, station_name, location_text, latitude, longitude, station_type, capacity, charging_slot_count, operating_status, electricity_status, power_capacity_kw)
values
  ('aaaa0001-0001-4000-a000-000000000001', 'HUB-SIAM', 'Siam Square Hub', 'Siam Square, Pathum Wan', 13.7466, 100.5328, 'hub', 20, 6, 'active', 'normal', 15.0),
  ('aaaa0001-0001-4000-a000-000000000002', 'KIK-ASOK', 'Asok Interchange Kiosk', 'Asok BTS / MRT Interchange', 13.7372, 100.5606, 'kiosk', 8, 2, 'active', 'normal', 5.0),
  ('aaaa0001-0001-4000-a000-000000000003', 'HUB-LUMP', 'Lumphini Park Hub', 'West Gate, Lumphini Park', 13.7305, 100.5418, 'hub', 15, 4, 'active', 'normal', 10.0)
on conflict (id) do nothing;

-- Link existing bikes to stations
update public.bikes set station_id = 'aaaa0001-0001-4000-a000-000000000001' where id = 'G-104';
update public.bikes set station_id = 'aaaa0001-0001-4000-a000-000000000002' where id = 'G-205';
update public.bikes set station_id = 'aaaa0001-0001-4000-a000-000000000003' where id = 'G-509';

-- Staff profiles (admin linked to existing admin profile)
insert into public.staff_profiles (id, profile_id, staff_name, role, permissions, station_id, status)
values (
  'bbbb0001-0001-4000-b000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Test Admin',
  'admin',
  '{"all":true}'::jsonb,
  'aaaa0001-0001-4000-a000-000000000001',
  'active'
) on conflict (id) do nothing;

-- Batteries
insert into public.batteries (id, battery_code, bike_id, station_id, status, charge_level, charge_cycles, state_of_health, last_inspection_date, voltage, current_amp, temperature_c)
values
  ('cccc0001-0001-4000-c000-000000000001', 'BAT-G104-01', 'G-104', 'aaaa0001-0001-4000-a000-000000000001', 'available', 87.0, 42, 94.5, '2026-06-15', 48.2, 12.1, 31.0),
  ('cccc0001-0001-4000-c000-000000000002', 'BAT-G205-01', 'G-205', 'aaaa0001-0001-4000-a000-000000000002', 'charging', 67.3, 78, 91.2, '2026-06-20', 47.8, 11.9, 32.5),
  ('cccc0001-0001-4000-c000-000000000003', 'BAT-G318-01', 'G-318', 'aaaa0001-0001-4000-a000-000000000001', 'available', 92.4, 15, 98.1, '2026-07-01', 48.9, 12.3, 30.2),
  ('cccc0001-0001-4000-c000-000000000004', 'BAT-G412-01', 'G-412', 'aaaa0001-0001-4000-a000-000000000003', 'available', 73.8, 56, 89.7, '2026-06-10', 47.1, 11.8, 33.1),
  ('cccc0001-0001-4000-c000-000000000005', 'BAT-G509-01', 'G-509', 'aaaa0001-0001-4000-a000-000000000003', 'in_use', 58.2, 104, 85.3, '2026-05-28', 48.5, 12.0, 34.0),
  ('cccc0001-0001-4000-c000-000000000006', 'BAT-G620-01', 'G-620', 'aaaa0001-0001-4000-a000-000000000001', 'available', 95.1, 8, 99.0, '2026-07-05', 49.1, 12.5, 29.8)
on conflict (id) do nothing;

-- Assign current batteries to bikes
update public.bikes set current_battery_id = 'cccc0001-0001-4000-c000-000000000001' where id = 'G-104';
update public.bikes set current_battery_id = 'cccc0001-0001-4000-c000-000000000003' where id = 'G-318';
update public.bikes set current_battery_id = 'cccc0001-0001-4000-c000-000000000004' where id = 'G-412';
update public.bikes set current_battery_id = 'cccc0001-0001-4000-c000-000000000006' where id = 'G-620';

-- Payments (matching existing wallet_transactions)
insert into public.payments (id, rental_transaction_id, wallet_transaction_id, profile_id, amount, currency_code, payment_method, payment_reference, payment_status, reconciliation_status, source_system)
values
  ('dddd0001-0001-4000-d000-000000000001', '73333333-3333-3333-3333-333333333331', '63333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 4.80, 'THB', 'wallet', 'WLT-4242-20260404', 'verified', 'reconciled', 'app'),
  ('dddd0001-0001-4000-d000-000000000002', '73333333-3333-3333-3333-333333333332', '63333333-3333-3333-3333-333333333332', '44444444-4444-4444-4444-444444444444', 3.95, 'THB', 'wallet', 'WLT-0188-20260402', 'verified', 'reconciled', 'app'),
  ('dddd0001-0001-4000-d000-000000000003', '73333333-3333-3333-3333-333333333333', '63333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 5.30, 'THB', 'wallet', 'WLT-8181-20260331', 'verified', 'reconciled', 'app')
on conflict (id) do nothing;

-- Link payments to rental transactions
update public.rental_transactions set payment_id = 'dddd0001-0001-4000-d000-000000000001' where id = '73333333-3333-3333-3333-333333333331';
update public.rental_transactions set payment_id = 'dddd0001-0001-4000-d000-000000000002' where id = '73333333-3333-3333-3333-333333333332';
update public.rental_transactions set payment_id = 'dddd0001-0001-4000-d000-000000000003' where id = '73333333-3333-3333-3333-333333333333';
update public.rental_transactions set start_station_id = 'aaaa0001-0001-4000-a000-000000000002', return_station_id = 'aaaa0001-0001-4000-a000-000000000003' where id = '73333333-3333-3333-3333-333333333331';
update public.rental_transactions set rental_status = 'completed' where id in ('73333333-3333-3333-3333-333333333331','73333333-3333-3333-3333-333333333332','73333333-3333-3333-3333-333333333333');

-- Asset inventory
insert into public.asset_inventory (id, item_description, quantity, station_id, procurement_date, warranty_status, stock_level, minimum_threshold)
values
  ('eeee0001-0001-4000-e000-000000000001', 'Brake Pad Set (Disc)', 12, 'aaaa0001-0001-4000-a000-000000000001', '2026-04-15', 'active', 8, 5),
  ('eeee0001-0001-4000-e000-000000000002', 'Inner Tube 26x2.0', 20, 'aaaa0001-0001-4000-a000-000000000001', '2026-03-01', 'active', 15, 10),
  ('eeee0001-0001-4000-e000-000000000003', 'Battery Charger 48V', 4, 'aaaa0001-0001-4000-a000-000000000003', '2026-05-01', 'active', 3, 2),
  ('eeee0001-0001-4000-e000-000000000004', 'QR Code Sticker (Roll)', 3, 'aaaa0001-0001-4000-a000-000000000001', '2026-02-10', 'expired', 0, 2),
  ('eeee0001-0001-4000-e000-000000000005', 'USB-C Lock Box', 10, null, '2026-04-20', 'active', 7, 3)
on conflict (id) do nothing;

-- Maintenance logs
insert into public.maintenance_logs (id, bike_id, repair_type, date_reported, date_finished, parts_used, technician_staff_id, post_repair_status, quality_check_status, status)
values (
  'ffff0001-0001-4000-f000-000000000001',
  'G-412',
  'cm',
  '2026-07-08T09:30:00Z',
  '2026-07-08T14:15:00Z',
  '[{"part":"Brake Pad Set (Disc)","qty":2,"cost":8.00}]'::jsonb,
  'bbbb0001-0001-4000-b000-000000000001',
  'ready',
  'passed',
  'completed'
) on conflict (id) do nothing;

-- Incidents
insert into public.incidents (id, rental_transaction_id, bike_id, profile_id, incident_type, description, status, resolution_status, assigned_staff_id)
values (
  'gggg0001-0001-4000-g000-000000000001',
  '73333333-3333-3333-3333-333333333332',
  'G-509',
  '44444444-4444-4444-4444-444444444444',
  'damage',
  'Minor scuff on rear mudguard reported by rider after Silom route ride.',
  'resolved',
  'resolved',
  'bbbb0001-0001-4000-b000-000000000001'
) on conflict (id) do nothing;

-- Audit logs
insert into public.audit_logs (id, actor_profile_id, actor_staff_id, user_role, action_performed, entity_table, entity_id, data_changed, device_location)
values (
  'hhhh0001-0001-4000-h000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'bbbb0001-0001-4000-b000-000000000001',
  'admin',
  'update',
  'bikes',
  'G-412',
  '{"status":{"old":"maintenance","new":"available"}}'::jsonb,
  'Siam Square Hub — Admin Console'
) on conflict (id) do nothing;

-- Operational reports (monthly snapshot for June 2026)
insert into public.operational_reports (id, report_type, period_start, period_end, usage_statistics, utilization_rate, app_availability_rate, service_downtime_minutes, user_satisfaction_score, daily_revenue, payment_reconciliation, generated_by_profile_id)
values (
  'iiii0001-0001-4000-i000-000000000001',
  'monthly',
  '2026-06-01',
  '2026-06-30',
  '{"total_rides":847,"active_bikes":6,"registered_users":182,"avg_duration_min":22.3}'::jsonb,
  78.5,
  99.2,
  45,
  4.3,
  10895.50,
  '{"total_collected":10895.50,"reconciled":10398.00,"pending":497.50,"exception":0}'::jsonb,
  '11111111-1111-1111-1111-111111111111'
) on conflict (id) do nothing;

-- Battery charging logs
insert into public.battery_charging_logs (id, station_id, battery_id, charging_slot_id, status, started_at, completed_at, voltage, current_amp, temperature_c, state_of_health)
values (
  'jjjj0001-0001-4000-j000-000000000001',
  'aaaa0001-0001-4000-a000-000000000002',
  'cccc0001-0001-4000-c000-000000000002',
  'ASOK-02',
  'completed',
  '2026-07-13T18:30:00Z',
  '2026-07-13T21:45:00Z',
  48.1,
  11.2,
  32.0,
  91.2
) on conflict (id) do nothing;

-- Service areas
insert into public.service_areas (id, zone_code, zone_name, city_name, zone_type, boundary, status)
values (
  'kkkk0001-0001-4000-k000-000000000001',
  'LAM-DOWNTOWN',
  'Downtown Lamphun Service Zone',
  'Lamphun',
  'returnable',
  extensions.ST_GeomFromText(
    'POLYGON((99.0000 18.5800, 99.0100 18.5800, 99.0100 18.5700, 99.0000 18.5700, 99.0000 18.5800))',
    4326
  )::extensions.geography(Polygon, 4326),
  'active'
) on conflict (id) do nothing;

-- Energy management
insert into public.energy_management (id, station_id, recorded_at, total_power_demand_kw, phase_l1_kw, phase_l2_kw, phase_l3_kw, tou_rate_period, applied_tou_rate, source_system)
values (
  'llll0001-0001-4000-l000-000000000001',
  'aaaa0001-0001-4000-a000-000000000001',
  '2026-07-14T14:30:00Z',
  12.45,
  4.21,
  4.12,
  4.12,
  'peak',
  4.75,
  'station'
) on conflict (id) do nothing;

-- Operational events (unlock/parking for the three existing rides)
insert into public.operational_events (id, rental_transaction_id, bike_id, profile_id, event_type, gps_location, created_at)
values
  (
    'mmmm0001-0001-4000-m000-000000000001',
    '73333333-3333-3333-3333-333333333331',
    'G-205',
    '33333333-3333-3333-3333-333333333333',
    'unlock',
    extensions.ST_MakePoint(100.5606, 13.7372)::extensions.geography(Point, 4326),
    '2026-04-04T10:15:00Z'
  ),
  (
    'mmmm0001-0001-4000-m000-000000000002',
    '73333333-3333-3333-3333-333333333331',
    'G-205',
    '33333333-3333-3333-3333-333333333333',
    'return',
    extensions.ST_MakePoint(100.5472, 13.7245)::extensions.geography(Point, 4326),
    '2026-04-04T10:41:00Z'
  ),
  (
    'mmmm0001-0001-4000-m000-000000000003',
    '73333333-3333-3333-3333-333333333332',
    'G-509',
    '44444444-4444-4444-4444-444444444444',
    'unlock',
    extensions.ST_MakePoint(100.5345, 13.7286)::extensions.geography(Point, 4326),
    '2026-04-02T05:30:00Z'
  ),
  (
    'mmmm0001-0001-4000-m000-000000000004',
    '73333333-3333-3333-3333-333333333332',
    'G-509',
    '44444444-4444-4444-4444-444444444444',
    'return',
    extensions.ST_MakePoint(100.5418, 13.7305)::extensions.geography(Point, 4326),
    '2026-04-02T05:50:00Z'
  ),
  (
    'mmmm0001-0001-4000-m000-000000000005',
    '73333333-3333-3333-3333-333333333333',
    'G-318',
    '55555555-5555-5555-5555-555555555555',
    'unlock',
    extensions.ST_MakePoint(100.5446, 13.7797)::extensions.geography(Point, 4326),
    '2026-03-31T11:05:00Z'
  ),
  (
    'mmmm0001-0001-4000-m000-000000000006',
    '73333333-3333-3333-3333-333333333333',
    'G-318',
    '55555555-5555-5555-5555-555555555555',
    'return',
    extensions.ST_MakePoint(100.5388, 13.7678)::extensions.geography(Point, 4326),
    '2026-03-31T11:38:00Z'
  )
on conflict (id) do nothing;

-- Sustainability reporting
insert into public.sustainability_reporting (id, report_id, period_start, period_end, estimated_distance_km, emission_factor_kgco2_per_km, trip_count, carbon_reduced_kg, fuel_savings_liters, total_travel_distance_km, energy_consumption_kwh, calculation_method, generated_by_profile_id)
values (
  'nnnn0001-0001-4000-n000-000000000001',
  'iiii0001-0001-4000-i000-000000000001',
  '2026-06-01',
  '2026-06-30',
  2184.50,
  0.000150,
  847,
  327.68,
  522.50,
  2184.50,
  182.70,
  'standard_v1',
  '11111111-1111-1111-1111-111111111111'
) on conflict (id) do nothing;

-- User engagement aggregates
insert into public.user_engagement_aggregates (id, profile_id, eco_points, carbon_reduced_total_kg, calories_burned_total, distance_accumulated_km)
values
  ('oooo0001-0001-4000-o000-000000000001', '33333333-3333-3333-3333-333333333333', 450, 12.8, 480, 85.2),
  ('oooo0001-0001-4000-o000-000000000002', '44444444-4444-4444-4444-444444444444', 310, 8.5, 320, 58.6),
  ('oooo0001-0001-4000-o000-000000000003', '55555555-5555-5555-5555-555555555555', 620, 17.2, 650, 112.4)
on conflict (id) do nothing;
