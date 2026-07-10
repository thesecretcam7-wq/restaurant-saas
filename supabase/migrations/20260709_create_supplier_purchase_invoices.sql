-- Supplier purchase invoices and line-level price history.

CREATE TABLE IF NOT EXISTS supplier_purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  invoice_number TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES supplier_purchase_invoices(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES inventory(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL,
  package_size NUMERIC(12,3) NOT NULL DEFAULT 1,
  package_unit TEXT NOT NULL DEFAULT 'unidad',
  line_total NUMERIC(12,2) NOT NULL,
  unit_price NUMERIC(12,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_invoices_tenant_date
  ON supplier_purchase_invoices(tenant_id, invoice_date DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_invoice_items_tenant_product
  ON supplier_purchase_invoice_items(tenant_id, lower(product_name), package_unit);

CREATE INDEX IF NOT EXISTS idx_supplier_purchase_invoice_items_invoice
  ON supplier_purchase_invoice_items(invoice_id);

ALTER TABLE supplier_purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_purchase_invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant owner can view supplier purchase invoices" ON supplier_purchase_invoices
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage supplier purchase invoices" ON supplier_purchase_invoices
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can view supplier purchase invoice items" ON supplier_purchase_invoice_items
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage supplier purchase invoice items" ON supplier_purchase_invoice_items
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
