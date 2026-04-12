-- Invoices/Fiscalidad System
-- Migration: Add automatic invoicing and tax management

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMPTZ DEFAULT now(),
  due_date TIMESTAMPTZ,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  items JSONB NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_date TIMESTAMPTZ,
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_prefix TEXT DEFAULT 'INV',
  invoice_start_number INT DEFAULT 1000,
  current_invoice_number INT DEFAULT 1000,
  auto_generate BOOLEAN DEFAULT true,
  tax_id TEXT,
  company_name TEXT,
  company_address TEXT,
  company_email TEXT,
  company_phone TEXT,
  payment_terms INT DEFAULT 30, -- days
  logo_url TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_tax_rates_tenant ON tax_rates(tenant_id);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invoices
CREATE POLICY "Tenant owner can view invoices" ON invoices
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage invoices" ON invoices
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for invoice settings
CREATE POLICY "Tenant owner can view invoice settings" ON invoice_settings
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage invoice settings" ON invoice_settings
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

-- RLS Policies for tax rates
CREATE POLICY "Tenant owner can view tax rates" ON tax_rates
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );

CREATE POLICY "Tenant owner can manage tax rates" ON tax_rates
  FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
  );
