ALTER TABLE public.restaurant_settings
  ADD COLUMN IF NOT EXISTS wompi_event_key TEXT;

NOTIFY pgrst, 'reload schema';
