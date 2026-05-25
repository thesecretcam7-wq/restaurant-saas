ALTER TABLE public.tenant_branding
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#040404',
  ADD COLUMN IF NOT EXISTS button_primary_color text DEFAULT '#D9A441',
  ADD COLUMN IF NOT EXISTS button_secondary_color text DEFAULT '#1B1710',
  ADD COLUMN IF NOT EXISTS text_primary_color text DEFAULT '#FFF4D8',
  ADD COLUMN IF NOT EXISTS text_secondary_color text DEFAULT '#B9A989',
  ADD COLUMN IF NOT EXISTS border_color text DEFAULT '#4A3515',
  ADD COLUMN IF NOT EXISTS section_background_color text DEFAULT '#11100D',
  ADD COLUMN IF NOT EXISTS gradient_start_color text DEFAULT '#040404',
  ADD COLUMN IF NOT EXISTS gradient_end_color text DEFAULT '#11100D',
  ADD COLUMN IF NOT EXISTS use_gradient boolean DEFAULT false;

NOTIFY pgrst, 'reload schema';
