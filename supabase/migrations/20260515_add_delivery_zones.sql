alter table public.restaurant_settings
  add column if not exists delivery_zones jsonb default '[]'::jsonb;

