# Demo Credentials - Eccofood

## ⚡ Cambios Nuevos (18 Abril 2026)

✅ **Cada nuevo usuario ahora recibe automáticamente:**
- Un tenant principal (su restaurante)
- Un tenant demo con datos de prueba
- Selector para cambiar entre restaurantes en el panel
- Opción para cambiar contraseña desde el panel admin

## Restaurante Demo

**Status:** ✅ Auto-creado al registrarse - 18 de Abril 2026

### Administrador (Propietario)

El propietario accede con **email + contraseña**. Para crear la cuenta demo:

**Opción 1: Crear Manualmente**
1. Ve a `https://restaurant-saas.vercel.app/register`
2. Registra como propietario:
   - **Email:** `admin@demo.com`
   - **Contraseña:** Tu contraseña de prueba
3. El sistema creará automáticamente el tenant "demo"

**Opción 2: Usar Cuenta Existente**
- **Email:** `juan@pizzeria-test.com` (propietario actual)
- Nota: Necesitas la contraseña de esta cuenta

### Personal Demo

| Rol | Nombre | PIN | Permisos |
|-----|--------|-----|----------|
| **Camarero** | Juan Camarero | `1234` | Dashboard, Mesas |
| **Cocinero** | Miguel Cocinero | `5678` | Dashboard, Menú |
| **Cajero** | Carlos Cajero | `9999` | Dashboard, Caja |

## Cómo Acceder

### En Desarrollo Local
```bash
# Accede a través de un subdomain local:
http://demo.localhost:3000/acceso
```

1. Navega a la página de acceso de empleados
2. Selecciona el rol (Camarero, Cocinero, Cajero)
3. Ingresa el PIN correspondiente
4. ¡Acceso concedido al panel de administrador!

### En Producción
Para acceder en Vercel, necesitas un dominio personalizado apuntando a la app:
- Configura `demo.tudominio.com` → `restaurant-saas.vercel.app`
- Accede a `https://demo.tudominio.com/acceso`

## SQL Ejecutado ✅

La migración fue ejecutada exitosamente en Supabase el 18 de Abril 2026.

### Script Ejecutado:

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
