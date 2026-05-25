CREATE TABLE IF NOT EXISTS public.cash_closing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_closing_id UUID NOT NULL REFERENCES public.cash_closings(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_closing_items_closing
  ON public.cash_closing_items(cash_closing_id);

CREATE INDEX IF NOT EXISTS idx_cash_closing_items_tenant
  ON public.cash_closing_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_cash_closing_items_order
  ON public.cash_closing_items(order_id);

ALTER TABLE public.cash_closing_items ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_closing_items TO authenticated;
GRANT ALL ON public.cash_closing_items TO service_role;

DROP POLICY IF EXISTS "Tenant owner can view cash closing items" ON public.cash_closing_items;
DROP POLICY IF EXISTS "Tenant owner can view closing items" ON public.cash_closing_items;
CREATE POLICY "Tenant owner can view closing items"
  ON public.cash_closing_items
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenant owner can insert cash closing items" ON public.cash_closing_items;
DROP POLICY IF EXISTS "Tenant owner can insert closing items" ON public.cash_closing_items;
CREATE POLICY "Tenant owner can insert closing items"
  ON public.cash_closing_items
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.tenants WHERE owner_id = auth.uid()
    )
  );

ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS total_delivery_fees NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_order_count INTEGER DEFAULT 0;

WITH delivery_totals AS (
  SELECT
    cci.cash_closing_id,
    COALESCE(SUM(COALESCE(o.delivery_fee, 0)), 0)::NUMERIC(10,2) AS total_delivery_fees,
    COUNT(*) FILTER (
      WHERE COALESCE(o.delivery_fee, 0) > 0
        OR o.delivery_type = 'delivery'
    ) AS delivery_order_count
  FROM public.cash_closing_items cci
  JOIN public.orders o ON o.id = cci.order_id
  WHERE o.payment_status = 'paid'
    AND COALESCE(o.status, '') <> 'cancelled'
  GROUP BY cci.cash_closing_id
)
UPDATE public.cash_closings cc
SET
  total_delivery_fees = dt.total_delivery_fees,
  delivery_order_count = dt.delivery_order_count,
  updated_at = now()
FROM delivery_totals dt
WHERE cc.id = dt.cash_closing_id;

NOTIFY pgrst, 'reload schema';
