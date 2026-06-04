-- Store the detailed month-end report snapshot used by monthly closing receipts.

ALTER TABLE monthly_closings
  ADD COLUMN IF NOT EXISTS report_details JSONB DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
