-- Insertar permisos disponibles
INSERT INTO admin_permissions (key, label, category, description) VALUES
  ('admin_dashboard', 'Dashboard Principal', 'admin', 'Ver dashboard de admin'),
  ('admin_staff', 'Gestión de Staff', 'admin', 'Ver, crear, editar empleados'),
  ('admin_reports', 'Reportes', 'reports', 'Acceder a reportes de ventas'),
  ('admin_settings', 'Configuración', 'admin', 'Acceder a configuración del restaurante'),
  ('admin_menu', 'Menú', 'menu', 'Editar menú y precios'),
  ('admin_finances', 'Finanzas', 'finances', 'Ver cuentas, ganancias, pagos'),
  ('admin_tables', 'Mesas', 'operacional', 'Gestionar estado de mesas')
ON CONFLICT (key) DO NOTHING;

-- Manager: acceso a todos los permisos admin
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'manager', id FROM admin_permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Waiter: solo dashboard y mesas
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'waiter', id FROM admin_permissions
  WHERE key IN ('admin_dashboard', 'admin_tables')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Chef: solo dashboard y menú
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'chef', id FROM admin_permissions
  WHERE key IN ('admin_dashboard', 'admin_menu')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Bartender: solo dashboard
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'bartender', id FROM admin_permissions
  WHERE key = 'admin_dashboard'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Cashier: dashboard, tables, y finances
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'cashier', id FROM admin_permissions
  WHERE key IN ('admin_dashboard', 'admin_tables', 'admin_finances')
ON CONFLICT (role, permission_id) DO NOTHING;

-- Kitchen_prep: solo dashboard y menú
INSERT INTO staff_role_permissions (role, permission_id)
  SELECT 'kitchen_prep', id FROM admin_permissions
  WHERE key IN ('admin_dashboard', 'admin_menu')
ON CONFLICT (role, permission_id) DO NOTHING;
