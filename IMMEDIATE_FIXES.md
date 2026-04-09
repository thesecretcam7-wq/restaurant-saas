# Action Plan - Fixes Inmediatos (Próximas 24-48 horas)

## 🚨 BLOCKER #1: Middleware No Encuentra Tenant por Slug

**Estado**: En investigación activa
**Línea**: middleware.ts → getTenantBySlug()

### Síntomas:
- ✅ Registro exitoso (200)
- ✅ Tenant creado en BD
- ✅ Redirect a /cloud-restaurant/admin/dashboard
- ❌ Página muestra "Restaurante No Encontrado"

### Últimas Hypotheses (9 Abril, 12:51 UTC):

1. **Supabase Connection Issue**
   - SERVICE_ROLE_KEY no funciona en middleware
   - createClient vs createServerClient (PARCIALMENTE TESTEADO)

2. **RLS Policy Issue**
   - Aunque usa SERVICE_ROLE_KEY (debería saltarse RLS)
   - ¿Hay política que bloquea SELECT en tenants?

3. **Slug Storage Issue** 
   - ¿Se guarda con whitespace?
   - ¿Conversión de encoding?
   - Hypothesis: "cloud-restaurant" ≠ lo que está en BD

4. **Timing Issue**
   - ¿Write no se replicó cuando read ocurre?
   - Unlikely en Supabase (single region)

### Debugging Steps (HACER AHORA):

```bash
# 1. Conectar a Supabase directamente
# Ir a https://supabase.com/dashboard
# Query manual en SQL editor:

SELECT id, slug, organization_name, owner_id 
FROM tenants 
WHERE slug = 'cloud-restaurant' 
LIMIT 1;

-- Si retorna 0 rows → Slug no se guardó
-- Si retorna datos → Está en BD, problema es en middleware

# 2. Si está en BD, revisar RLS:
-- Ejecutar como usuario propietario:
SELECT * FROM tenants WHERE id = '{tenant_id}';

-- Ejecutar como SERVICE_ROLE:
SELECT * FROM tenants WHERE slug = 'cloud-restaurant';

# 3. Revisar logs de Supabase
-- https://supabase.com/dashboard/project/{project}/logs
-- Buscar: PostgreSQL errors, JWT validation
```

### Fix Attempt Order:

1. ✅ **DONE**: Cambié createServerClient → createClient
2. ✅ **DONE**: Agregué logging detallado
3. ⏳ **WAITING**: Deployment y test
4. 📋 **NEXT**:
   - Si aún falla → Revisar RLS policies en tenants
   - Si aún falla → Query directo a BD desde Supabase console
   - Si aún falla → Considerar crear tenant desde admin panel en lugar de API

---

## 🔒 BLOCKER #2: Admin Routes Sin Protección

**Severidad**: ALTA (security issue)
**Ubicación**: app/[domain]/(admin)/**

### Problema:

Usuario A se registra como "restaurant-a"
Usuario A sabe que Usuario B tiene "restaurant-b"
Usuario A visita: `https://app.com/restaurant-b/admin/dashboard`

¿Qué pasa?
- ❌ Actualmente: ACCESO PERMITIDO (solo chequea suscripción)
- ✅ Debería: ACCESO DENEGADO (verificar ownership)

### Fix:

**Archivo**: app/[domain]/(admin)/layout.tsx (línea 45)

Agregar verificación de ownership ANTES de mostrar admin panel:

```typescript
// AGREGAR ESTO:
const checkOwnership = async () => {
  try {
    const response = await fetch(`/api/verify-tenant-owner?domain=${domain}`)
    const { isOwner } = await response.json()
    
    if (!isOwner) {
      router.push('/unauthorized')
      return
    }
  } catch (err) {
    router.push('/unauthorized')
  }
}

// Y crear: app/api/verify-tenant-owner/route.ts
// POST /api/verify-tenant-owner?domain=restaurant-b
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: tenant } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('slug', domain)
    .single()
  
  return Response.json({
    isOwner: tenant?.owner_id === user?.id
  })
}
```

**Tiempo estimado**: 15 minutos

---

## 📊 QUICK FIX #1: Dashboard Stats

**Severidad**: MEDIA (UX issue)
**Ubicación**: app/[domain]/(admin)/dashboard/page.tsx

### Problema:
Stats muestran "—" (vacíos)

### Fix:
1. Crear endpoint: `/api/dashboard-stats/route.ts`
2. Agregar a dashboard: fetch desde useEffect

**Código**:

```typescript
// app/api/dashboard-stats/route.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain')
  
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()
  
  // Obtener tenant_id desde slug
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', domain)
    .single()
  
  // Obtener stats
  const { data: orders } = await supabase
    .from('orders')
    .select('total')
    .eq('tenant_id', tenant.id)
  
  const totalOrders = orders?.length || 0
  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0
  
  return NextResponse.json({
    totalOrders,
    totalRevenue,
    totalReservations: 0,
    totalCustomers: 0
  })
}
```

**Tiempo estimado**: 20 minutos

---

## 📋 QUICK FIX #2: Feature Gates por Plan

**Severidad**: MEDIA (business logic)
**Ubicación**: lib/feature-gates.ts (nuevo archivo)

### Problema:
Plan FREE debe mostrar solo menú básico, pero actualmente muestra todo

### Fix:
1. Crear feature gates config
2. Agregar en componentes condicionales

**Código**:

```typescript
// lib/feature-gates.ts
export const PLAN_FEATURES = {
  free: {
    categories: true,
    items: true,
    orders: true,
    delivery: false,
    reservations: false,
    staff_management: false,
    analytics: false,
  },
  basic: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: false,
    staff_management: false,
    analytics: false,
  },
  pro: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: true,
    staff_management: true,
    analytics: false,
  },
  premium: {
    categories: true,
    items: true,
    orders: true,
    delivery: true,
    reservations: true,
    staff_management: true,
    analytics: true,
  },
}

export function canUseFeature(plan: string, feature: keyof typeof PLAN_FEATURES.free): boolean {
  return PLAN_FEATURES[plan as keyof typeof PLAN_FEATURES]?.[feature] ?? false
}
```

**Uso**:

```typescript
import { canUseFeature } from '@/lib/feature-gates'

// En dashboard:
{canUseFeature(subscriptionStatus.plan, 'delivery') && (
  <Link href={`/${domain}/admin/delivery`}>
    🚚 Delivery
  </Link>
)}
```

**Tiempo estimado**: 30 minutos

---

## 🎯 PRIORIDAD Y TIMELINE

### HOY (9 Abril):
- [ ] Esperar a que deployment con logging detallado esté listo
- [ ] Test manual: Registrar nuevo restaurante
- [ ] Revisar logs en Vercel
- [ ] Si aún falla → Debugging SQL en Supabase

### MAÑANA (10 Abril):
- [ ] Implementar Fix #2 (Admin route protection)
- [ ] Implementar Quick Fix #1 (Dashboard stats)
- [ ] Implementar Quick Fix #2 (Feature gates)

### ESTA SEMANA:
- [ ] Resolver Bug #7 completamente
- [ ] Stripe webhook integration
- [ ] Email notifications

---

## 📞 DEBUGGING COMMANDS

```bash
# Para ver últimos logs en Vercel:
vercel logs restaurant-saas --tail

# Para ver logs de Supabase:
# 1. Dashboard → project → Logs
# 2. Filtrar: database logs, auth logs

# Para test local:
npm run dev
# Ir a http://localhost:3000/register
# Registrar: "Test Restaurant"
# Abrir DevTools → Console
# Ver logs: 📝, 📡, ✅, ❌
```

---

Actualizado: 9 Abril 2026, 12:51 UTC
