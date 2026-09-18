-- Allow supplier bills paid outside the POS cash drawer.
-- cash keeps affecting cash closings; external is tracked only in admin finance summaries.

ALTER TABLE cash_bill_payments
  DROP CONSTRAINT IF EXISTS cash_bill_payments_payment_method_check;

ALTER TABLE cash_bill_payments
  ADD CONSTRAINT cash_bill_payments_payment_method_check
  CHECK (payment_method IN ('cash', 'external'));

CREATE INDEX IF NOT EXISTS idx_cash_bill_payments_tenant_paid_method
  ON cash_bill_payments(tenant_id, paid_at, payment_method)
  WHERE status = 'active';
