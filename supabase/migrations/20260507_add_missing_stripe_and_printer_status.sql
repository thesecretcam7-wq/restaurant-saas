ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_account_status text CHECK (stripe_account_status IN ('verified', 'pending', 'failed'));

ALTER TABLE public.printer_devices
  ALTER COLUMN status SET DEFAULT 'connected';

UPDATE public.printer_devices
SET status = 'connected',
    updated_at = COALESCE(updated_at, now())
WHERE (config->>'connection_mode' = 'browser_driver' OR (vendor_id IS NULL AND product_id IS NULL))
  AND COALESCE(status, '') <> 'connected';
