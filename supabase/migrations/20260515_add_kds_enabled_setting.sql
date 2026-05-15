alter table public.restaurant_settings
  add column if not exists kds_enabled boolean default false;

