-- Create attendance/session log table
CREATE TABLE IF NOT EXISTS staff_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cocinero', 'camarero', 'cajero', 'admin')),
  pin TEXT NOT NULL,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  logout_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_sessions_tenant ON staff_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_date ON staff_sessions(tenant_id, DATE(login_at));

-- Enable RLS
ALTER TABLE staff_sessions ENABLE ROW LEVEL SECURITY;

-- Policies (allow all for now, service role bypasses anyway)
CREATE POLICY "Staff sessions read" ON staff_sessions FOR SELECT USING (true);
CREATE POLICY "Staff sessions write" ON staff_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Staff sessions update" ON staff_sessions FOR UPDATE USING (true);
