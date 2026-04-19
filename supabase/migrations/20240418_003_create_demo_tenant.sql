-- Create demo tenant for testing
INSERT INTO tenants (id, slug, organization_name, status, subscription_plan, owner_id, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'demo',
  'Restaurante Demo Eccofood',
  'active',
  'premium',
  'f47ac10b-58cc-4372-a567-0e02b2c3d470',
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Create demo staff members
INSERT INTO staff_members (tenant_id, name, email, role, pin, is_active, created_at)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Juan Camarero', 'camarero@demo.com', 'waiter', '1234', true, NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Miguel Cocinero', 'cocinero@demo.com', 'chef', '5678', true, NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Carlos Manager', 'manager@demo.com', 'manager', '9999', true, NOW())
ON CONFLICT DO NOTHING;

-- Create demo restaurant settings
INSERT INTO restaurant_settings (tenant_id, waiter_pin, kitchen_pin)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '1234', '5678')
ON CONFLICT (tenant_id) DO UPDATE SET
  waiter_pin = '1234',
  kitchen_pin = '5678';

-- Create demo branding
INSERT INTO tenant_branding (tenant_id, app_name, primary_color, secondary_color)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Restaurante Demo', '#10b981', '#3b82f6')
ON CONFLICT (tenant_id) DO UPDATE SET
  app_name = 'Restaurante Demo',
  primary_color = '#10b981',
  secondary_color = '#3b82f6';
