ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS total_delivery_fees NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_order_count INTEGER DEFAULT 0;
