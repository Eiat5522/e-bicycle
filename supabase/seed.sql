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
