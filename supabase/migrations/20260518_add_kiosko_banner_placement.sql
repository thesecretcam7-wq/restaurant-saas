ALTER TABLE public.kiosko_banners
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'both';

ALTER TABLE public.kiosko_banners
  DROP CONSTRAINT IF EXISTS kiosko_banners_placement_check;

ALTER TABLE public.kiosko_banners
  ADD CONSTRAINT kiosko_banners_placement_check
  CHECK (placement IN ('top', 'bottom', 'both'));

CREATE INDEX IF NOT EXISTS idx_kiosko_banners_placement
  ON public.kiosko_banners(tenant_id, placement, active, sort_order);

NOTIFY pgrst, 'reload schema';
