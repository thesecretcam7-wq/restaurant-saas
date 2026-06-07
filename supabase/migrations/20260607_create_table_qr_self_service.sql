-- Self-service QR ordering for restaurant tables.
-- Idempotent because older environments may already have the original QR tables.

CREATE TABLE IF NOT EXISTS public.table_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  qr_code_data TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.table_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  order_items JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'completed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_qr_codes_tenant ON public.table_qr_codes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_table_qr_codes_table ON public.table_qr_codes(table_id);
CREATE INDEX IF NOT EXISTS idx_table_qr_codes_unique ON public.table_qr_codes(unique_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_qr_codes_active_table
  ON public.table_qr_codes(tenant_id, table_id)
  WHERE is_active = true AND table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_table_orders_tenant ON public.table_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_table ON public.table_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_session ON public.table_orders(session_id);
CREATE INDEX IF NOT EXISTS idx_table_orders_status ON public.table_orders(status);

ALTER TABLE public.table_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_orders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'table_qr_codes' AND policyname = 'Tenant owner can view qr codes'
  ) THEN
    CREATE POLICY "Tenant owner can view qr codes" ON public.table_qr_codes
      FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'table_qr_codes' AND policyname = 'Tenant owner can manage qr codes'
  ) THEN
    CREATE POLICY "Tenant owner can manage qr codes" ON public.table_qr_codes
      FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'table_orders' AND policyname = 'Tenant owner can view table orders'
  ) THEN
    CREATE POLICY "Tenant owner can view table orders" ON public.table_orders
      FOR SELECT USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'table_orders' AND policyname = 'Tenant owner can manage table orders'
  ) THEN
    CREATE POLICY "Tenant owner can manage table orders" ON public.table_orders
      FOR ALL USING (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()))
      WITH CHECK (tenant_id IN (SELECT id FROM public.tenants WHERE owner_id = auth.uid()));
  END IF;
END $$;
