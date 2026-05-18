-- Billing notifications and payment retry support.
-- These columns are used by the cron jobs and owner dashboard before go-live.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_expiration_notified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_expiration_notified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_failure_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_payment_failure_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tenants_trial_notification
  ON public.tenants(status, trial_ends_at)
  WHERE status = 'trial' AND trial_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_subscription_notification
  ON public.tenants(status, subscription_expires_at)
  WHERE status = 'active' AND subscription_expiration_notified = false;

CREATE INDEX IF NOT EXISTS idx_tenants_payment_failures
  ON public.tenants(payment_failure_count)
  WHERE payment_failure_count > 0;

NOTIFY pgrst, 'reload schema';
