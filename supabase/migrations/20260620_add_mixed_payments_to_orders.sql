ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_breakdown JSONB;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('stripe', 'cash', 'wompi', 'mixed'));
