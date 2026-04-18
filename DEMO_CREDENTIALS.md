# Demo Credentials - Eccofood

Para probar la aplicación, usa las siguientes credenciales:

## Restaurante Demo

**Acceso:** https://restaurant-saas.vercel.app/demo

### Roles Disponibles

| Rol | PIN | Permisos |
|-----|-----|----------|
| **Camarero** | `1234` | Dashboard, Mesas |
| **Cocinero** | `5678` | Dashboard, Menú |
| **Manager** | `9999` | Todo |

## Cómo Ingresar

1. Ve a https://restaurant-saas.vercel.app/demo
2. Selecciona el rol (Camarero, Cocinero, etc.)
3. Ingresa el PIN correspondiente
4. ¡Acceso concedido!

## Para Crear la Demo en tu Supabase

Si necesitas crear esta data manualmente, ejecuta este SQL en tu consola de Supabase:

```sql
-- Crear tenant demo
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

-- Crear staff members
INSERT INTO staff_members (tenant_id, name, email, role, pin, is_active, created_at)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Juan Camarero', 'camarero@demo.com', 'waiter', '1234', true, NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Miguel Cocinero', 'cocinero@demo.com', 'chef', '5678', true, NOW()),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Carlos Manager', 'manager@demo.com', 'manager', '9999', true, NOW())
ON CONFLICT DO NOTHING;

-- Crear configuración del restaurante
INSERT INTO restaurant_settings (tenant_id, waiter_pin, kitchen_pin)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', '1234', '5678')
ON CONFLICT (tenant_id) DO UPDATE SET waiter_pin = '1234', kitchen_pin = '5678';

-- Crear branding
INSERT INTO tenant_branding (tenant_id, app_name, primary_color, secondary_color)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Restaurante Demo', '#10b981', '#3b82f6')
ON CONFLICT (tenant_id) DO UPDATE SET app_name = 'Restaurante Demo', primary_color = '#10b981', secondary_color = '#3b82f6';
```

## Cambiar el PIN de un Empleado

Para cambiar el PIN de camarero a otro valor:

```sql
UPDATE staff_members
SET pin = '9876'
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND role = 'waiter'
  AND email = 'camarero@demo.com';
```

O si prefieres usar el PIN genérico:

```sql
UPDATE restaurant_settings
SET waiter_pin = '9876'
WHERE tenant_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
```

---

**Nota:** Esta es una cuenta de demostración. Los cambios aquí son solo para pruebas.
