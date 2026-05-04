-- Crear tabla de permisos disponibles en el sistema
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR UNIQUE NOT NULL,
  label VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  CHECK (key ~ '^[a-z_]+$')
);

-- Tabla de asignaciones: qué permisos tiene cada staff
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES tenants(owner_id),
  granted_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(staff_id, permission_id)
);

-- Tabla de roles preestablecidos
CREATE TABLE IF NOT EXISTS staff_role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR NOT NULL,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,

  UNIQUE(role, permission_id)
);

-- Crear índices
CREATE INDEX idx_staff_permissions_staff_id ON staff_permissions(staff_id);
CREATE INDEX idx_staff_permissions_permission_id ON staff_permissions(permission_id);
CREATE INDEX idx_staff_role_permissions_role ON staff_role_permissions(role);

-- Habilitar RLS
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para admin_permissions (todos pueden leer)
CREATE POLICY "Anyone can read admin_permissions" ON admin_permissions
  FOR SELECT USING (true);

-- Políticas RLS para staff_permissions
CREATE POLICY "Owner can manage permissions" ON staff_permissions
  FOR ALL USING (
    staff_id IN (
      SELECT id FROM staff
      WHERE tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    )
  );

CREATE POLICY "Staff can read own permissions" ON staff_permissions
  FOR SELECT USING (
    staff_id IN (
      SELECT id FROM staff WHERE email = auth.jwt()->>'email'
    )
  );

-- Políticas RLS para staff_role_permissions (todos pueden leer)
CREATE POLICY "Anyone can read staff_role_permissions" ON staff_role_permissions
  FOR SELECT USING (true);
