# Setup: Sistema de Permisos Granulares para Empleados

## Resumen de Cambios

Se implementó un sistema de permisos granulares que permite a empleados (meseros, chefs, managers) acceder al panel de administración con control fino de qué módulos ven.

### Archivos Creados

1. **Migraciones SQL**
   - `supabase/migrations/20240418_001_add_staff_permissions.sql` - Crea tablas de permisos
   - `supabase/migrations/20240418_002_seed_admin_permissions.sql` - Seed de permisos por defecto

2. **Utilidades Backend**
   - `lib/staff-permissions.ts` - Funciones para gestionar permisos

3. **Componentes UI**
   - `app/[domain]/unauthorized.tsx` - Página de acceso denegado

### Archivos Modificados

1. **API**
   - `app/api/staff/auth/route.ts` - Ahora devuelve permisos en respuesta

2. **Layouts & Pages**
   - `app/[domain]/admin/layout.tsx` - Valida permisos de staff además de owner

3. **Middleware**
   - `middleware.ts` - Valida permisos en rutas `/admin/*`

4. **Páginas de Empleados**
   - `app/[domain]/mesero/page.tsx` - Almacena permisos en cookie
   - `app/[domain]/cocina/page.tsx` - Almacena permisos en cookie

---

## Cómo Funciona

### Arquitectura de Permisos

```
Flujo de Autenticación:
┌─────────────┐
│  Staff PIN  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ /api/staff/auth                          │
│ 1. Valida PIN                            │
│ 2. Obtiene role (waiter, chef, manager) │
│ 3. Busca permisos por rol                │
│ 4. Devuelve {permissions: [...]}         │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Cliente                                  │
│ 1. Almacena en localStorage              │
│ 2. Almacena en cookie (staff_session)    │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Al acceder /admin/*                      │
│ 1. Middleware valida cookie              │
│ 2. Layout valida permisos                │
│ 3. Si tiene admin_*, permitir            │
│ 4. Si no, redirige a /unauthorized       │
└──────────────────────────────────────────┘
```

### Tabla de Permisos

Los permisos disponibles son:

| Permiso | Descripción |
|---------|-------------|
| `admin_dashboard` | Ver dashboard principal |
| `admin_staff` | Gestionar empleados |
| `admin_reports` | Ver reportes de ventas |
| `admin_settings` | Configurar restaurante |
| `admin_menu` | Editar menú y precios |
| `admin_finances` | Ver finanzas |
| `admin_tables` | Gestionar mesas |

### Asignación por Rol (por defecto)

- **Manager**: Todos los permisos ✅
- **Chef**: `admin_dashboard`, `admin_menu`
- **Waiter**: `admin_dashboard`, `admin_tables`
- **Cashier**: `admin_dashboard`, `admin_tables`, `admin_finances`
- **Bartender**: `admin_dashboard`
- **Kitchen Prep**: `admin_dashboard`, `admin_menu`

---

## Instalación

### 1. Aplicar Migraciones en Supabase

**Opción A: Dashboard de Supabase**
1. Abre [supabase.com](https://supabase.com) → Tu proyecto
2. SQL Editor → New Query
3. Copia el contenido de `supabase/migrations/20240418_001_add_staff_permissions.sql`
4. Ejecuta (Cmd + Enter)
5. Repite con `20240418_002_seed_admin_permissions.sql`

**Opción B: CLI (Recomendado)**
```bash
supabase db push
```

### 2. Verificar Instalación

En Supabase SQL Editor, ejecuta:
```sql
-- Verificar tablas creadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_permissions', 'staff_permissions', 'staff_role_permissions');

-- Verificar permisos creados
SELECT key, label, category FROM admin_permissions ORDER BY key;

-- Verificar asignaciones por rol
SELECT role, COUNT(*) as permission_count 
FROM staff_role_permissions 
GROUP BY role;
```

---

## Uso

### Para Propietarios (Admin)

El panel admin sigue funcionando igual. Solo necesitan login con email/password.

### Para Empleados

#### Mesero accede a admin dashboard
1. Entra el PIN en `/mesero`
2. Rol "waiter" recibe permisos: `['admin_dashboard', 'admin_tables']`
3. Puede acceder a `/admin/dashboard` (tiene permiso)
4. NO puede acceder a `/admin/staff` (no tiene permiso)

#### Chef accede a gestionar menú
1. Entra el PIN en `/cocina`
2. Rol "chef" recibe permisos: `['admin_dashboard', 'admin_menu']`
3. Puede acceder a `/admin/menu`
4. NO puede acceder a `/admin/reports`

---

## Permisos Personalizados (Futuro)

Para permitir que el propietario asigne permisos personalizados a empleados específicos:

```typescript
// Ejemplo: Dar reporte acceso a waiter específico
import { grantPermission } from '@/lib/staff-permissions'

await grantPermission(
  supabase,
  staffId,      // UUID del staff
  'admin_reports',
  ownerId       // Quién otorgó el permiso
)
```

---

## Testing

### Test 1: Manager accede a admin
```bash
1. Navega a /[tenant-id]/cocina
2. Entra PIN de cocina (role=kitchen)
3. Intenta ir a /[tenant-id]/admin/dashboard
4. ✅ Debe permitir (manager tiene admin_dashboard)
5. Intenta ir a /[tenant-id]/admin/staff
6. ✅ Debe permitir (manager tiene admin_staff)
```

### Test 2: Waiter NO accede a staff
```bash
1. Navega a /[tenant-id]/mesero
2. Entra PIN de mesero (role=waiter)
3. Intenta ir a /[tenant-id]/admin/dashboard
4. ✅ Debe permitir (waiter tiene admin_dashboard)
5. Intenta ir a /[tenant-id]/admin/staff
6. ❌ Debe denegar (waiter NO tiene admin_staff) → redirige a /unauthorized
```

### Test 3: Logout limpia sesión
```bash
1. Login en mesero
2. Clic "Salir"
3. Intenta acceder /admin/dashboard sin login nuevo
4. ❌ Debe denegar
```

---

## Troubleshooting

### Error: "Acceso Denegado" en admin
- **Causa**: Staff session no tiene permisos de admin
- **Solución**: Verifica que el rol devuelve permisos que empiezan con "admin_"

### Error: Middleware redirige a /unauthorized
- **Causa**: Cookie `staff_session` no tiene permisos
- **Solución**: Revisa que el endpoint `/api/staff/auth` incluye permisos

### Permisos no actualizan después de cambiar rol
- **Causa**: Sesión cacheada en localStorage/cookie
- **Solución**: Hacer logout y login nuevamente

---

## API Reference

### GET /api/staff/auth (POST)

**Request:**
```json
{
  "domain": "mirestaurante",
  "pin": "1234",
  "role": "waiter"
}
```

**Response (Success):**
```json
{
  "success": true,
  "role": "waiter",
  "tenantId": "123e4567-e89b-12d3-a456-426614174000",
  "permissions": ["admin_dashboard", "admin_tables"]
}
```

### Funciones en `/lib/staff-permissions.ts`

```typescript
// Validar si staff tiene permiso específico
staffHasPermission(supabase, staffId, 'admin_dashboard')

// Obtener todos los permisos de un staff
getStaffPermissions(supabase, staffId)

// Asignar permisos basado en rol
assignPermissionsByRole(supabase, staffId, 'chef')

// Otorgar permiso individual
grantPermission(supabase, staffId, 'admin_reports', ownerId?)

// Revocar permiso individual
revokePermission(supabase, staffId, 'admin_reports')
```

---

## Notas Técnicas

### Cookies vs localStorage
- **localStorage**: Accesible solo en cliente, usado para persistencia local
- **Cookie**: Accesible en servidor, usado para validación en middleware/layout

### Por qué validar en 3 lugares
1. **Middleware**: Primer checkpoint, rápido
2. **Admin Layout**: Segundo checkpoint, para server components
3. **UI**: Tercer checkpoint, para mostrar/ocultar elementos

### Seguridad
- RLS en Supabase protege datos en BD
- Middleware protege acceso a rutas
- Admin layout protege renderizado
- Permisos en sesión son read-only desde cliente

---

## Próximos Pasos

1. ✅ Panel para owner asignar permisos personalizados a empleados
2. ✅ Auditoría: registrar quién accedió a qué y cuándo
3. ✅ Restricciones por feature: solo ciertos módulos activos
4. ✅ Roles dinámicos: crear roles personalizados
