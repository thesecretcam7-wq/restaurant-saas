-- Create staff members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cocinero', 'camarero', 'cajero')),
  pin TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_pin ON staff_members(tenant_id, pin);

-- Enable RLS
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- RLS Policy: tenants can only see their own staff
CREATE POLICY "Tenants can view their staff" ON staff_members
  FOR SELECT USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));

CREATE POLICY "Tenants can manage their staff" ON staff_members
  FOR ALL USING (tenant_id IN (SELECT id FROM tenants WHERE id = tenant_id));
