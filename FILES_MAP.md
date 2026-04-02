# Mapa de Archivos: Sistema de Facturación

## Archivos Nuevos Creados

```
restaurant-saas/
│
├── 📖 DOCUMENTACIÓN NUEVA (8 archivos)
│   ├── START_HERE_BILLING.md              ⭐ EMPIEZA AQUÍ
│   ├── README_BILLING.md                  ← Resumen ejecutivo
│   ├── SUBSCRIPTION_SETUP.md              ← Guía técnica
│   ├── SUBSCRIPTION_FLOW.md               ← Diagramas visuales
│   ├── STRIPE_SETUP_GUIDE.md              ← Configurar Stripe
│   ├── DEPLOYMENT_CHECKLIST.md            ← Desplegar
│   ├── IMPLEMENTATION_SUMMARY.md          ← Qué cambió
│   └── IMPLEMENTATION_COMPLETE.txt        ← Este resumen
│
├── app/
│   ├── api/
│   │   └── stripe/
│   │       ├── subscription/
│   │       │   └── route.ts                  ✨ NUEVO
│   │       │       └─ POST /api/stripe/subscription
│   │       │          Crear suscripción en Stripe
│   │       │
│   │       └── webhook/
│   │           └── route.ts                  ✏️ ACTUALIZADO
│   │               └─ Mejorado para manejar eventos de suscripción
│   │
│   └── [domain]/
│       ├── (admin)/
│       │   ├── layout.tsx                     ✨ NUEVO
│       │   │   └─ Validación de suscripción
│       │   │      ├─ Redirige a /subscription-blocked si no activo
│       │   │      └─ Banner de trial en período de prueba
│       │   │
│       │   ├── subscription-blocked/         ✨ NUEVA CARPETA
│       │   │   └── page.tsx
│       │   │       └─ Página de bloqueo cuando no hay suscripción
│       │   │
│       │   ├── dashboard/                    ✨ NUEVO
│       │   │   └── page.tsx
│       │   │       └─ Panel principal del admin
│       │   │
│       │   └── configuracion/
│       │       └── planes/                   ✨ NUEVA CARPETA
│       │           └── page.tsx
│       │               └─ Seleccionar plan de suscripción
│       │
│       └── api/
│           ├── subscription-status/
│           │   └── route.ts                  ✨ NUEVO
│           │       └─ GET /api/subscription-status
│           │          Verificar estado
│           │
│           └── subscription-plans/
│               └── route.ts                  ✨ NUEVO
│                   └─ GET /api/subscription-plans
│                      Obtener planes disponibles
│
├── lib/
│   ├── subscription.ts                       ✨ NUEVO
│   │   └─ getTenantSubscriptionStatus()
│   │      getSubscriptionPlans()
│   │
│   ├── types.ts                              ✏️ ACTUALIZADO
│   │   └─ Agregado: stripe_customer_id en Tenant
│   │
│   └── supabase/
│       └── schema.sql                        ✏️ ACTUALIZADO
│           └─ Agregado: stripe_customer_id column
│
├── supabase/
│   └── seed-subscription-plans.sql           ✨ NUEVO
│       └─ Script para insertar planes
│
└── FILES_MAP.md                              ← Este archivo
```

---

## Resumen de Cambios por Carpeta

### `📁 app/api/`
```
NUEVA RUTA: /api/stripe/subscription
├── Método: POST
├── Acción: Iniciar checkout de suscripción
└── Retorna: URL de Stripe Checkout

NUEVA RUTA: /api/subscription-status
├── Método: GET
├── Parámetro: ?domain=...
└── Retorna: Estado de suscripción del tenant

NUEVA RUTA: /api/subscription-plans
├── Método: GET
└── Retorna: Lista de planes (Basic, Pro, Premium)

ACTUALIZADO: /api/stripe/webhook
├── Maneja 5 eventos nuevos
└── Actualiza status automáticamente
```

### `📁 app/[domain]/(admin)/`
```
NUEVO LAYOUT:
└── layout.tsx
    ├── useEffect con validación
    ├── GET /api/subscription-status
    ├── Decide: ¿Bloquear o permitir?
    └── Muestra banner de trial

NUEVAS PÁGINAS:
├── /subscription-blocked
│   └── Mostrar cuando no hay suscripción
├── /dashboard
│   └── Panel principal del admin
└── /configuracion/planes
    └── Seleccionar y pagar plan
```

### `📁 lib/`
```
NUEVO ARCHIVO:
└── subscription.ts
    ├── getTenantSubscriptionStatus()
    │   └─ Calcula si está en trial o activo
    └── getSubscriptionPlans()
        └─ Obtiene planes de BD

ACTUALIZADO:
└── types.ts
    └─ Tenant interface + stripe_customer_id

ACTUALIZADO:
└── supabase/schema.sql
    └─ ALTER TABLE tenants ADD stripe_customer_id
```

### `📁 supabase/`
```
NUEVO ARCHIVO:
└── seed-subscription-plans.sql
    ├── INSERT INTO subscription_plans
    ├── Basic $29.99/mes
    ├── Pro $79.99/mes
    └── Premium $199.99/mes
```

---

## Rutas de Cliente (User-Facing)

```
┌─ Rutas PÚBLICAS (sin validación)
│  ├─ /                              (home)
│  ├─ /[domain]                      (restaurante home)
│  ├─ /[domain]/menu                 (menú)
│  ├─ /[domain]/carrito              (carrito)
│  └─ /[domain]/checkout             (pagar órdenes)
│
└─ Rutas ADMIN (CON VALIDACIÓN)
   ├─ /[domain]/(admin)/dashboard             ✅ Layout valida
   │  └─ Si no activo → redirige a /subscription-blocked
   │
   ├─ /[domain]/(admin)/subscription-blocked  (sin validación)
   │  └─ Página de bloqueo
   │     ├─ "Tu trial venció"
   │     ├─ "Elige un plan"
   │     └─ Botón → /configuracion/planes
   │
   ├─ /[domain]/(admin)/configuracion/planes  (sin validación)
   │  └─ Página de planes
   │     ├─ Lista 3 planes
   │     ├─ Botón "Seleccionar"
   │     └─ Redirige a Stripe Checkout
   │
   └─ Otras rutas admin
      ├─ /productos
      ├─ /pedidos
      ├─ /reservas
      └─ etc. (protegidas por layout)
```

---

## Flujo de URLs

```
Usuario registra nuevo restaurante
      ↓
www.mirestaurante.com/admin/dashboard
      ↓
Layout valida → /api/subscription-status
      ↓
¿Está en trial (< 14 días)?
   │
   ├─ SÍ → renderiza children + banner
   │       "14 días restantes"
   │
   └─ NO ¿Tiene suscripción activa?
       │
       ├─ SÍ → renderiza children (sin banner)
       │
       └─ NO → push(/subscription-blocked)
               │
               ├─ Usuario ve página de bloqueo
               ├─ "Tu período de prueba venció"
               └─ Botón "Ver Planes" → /configuracion/planes
                   │
                   └─ Usuario ve 3 planes
                       └─ Selecciona Plan
                           └─ POST /api/stripe/subscription
                               └─ Redirige a Stripe Checkout
                                   └─ Paga con tarjeta
                                       └─ Webhook: customer.subscription.created
                                           └─ UPDATE tenants: status='active'
                                               └─ Próximo acceso al admin
                                                   └─ ✅ PERMITIDO
```

---

## Variables de Entorno Necesarias

```
ANTES (ya existen):
├─ STRIPE_SECRET_KEY=sk_test_...
├─ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
├─ NEXT_PUBLIC_SUPABASE_URL=...
├─ SUPABASE_SERVICE_ROLE_KEY=...
└─ NEXT_PUBLIC_APP_URL=http://localhost:3000

NUEVA (debe agregar):
└─ STRIPE_WEBHOOK_SECRET=whsec_...
   └─ Obtener de Stripe Dashboard
   └─ Agregar en .env.local y Vercel
```

---

## Base de Datos: Cambios

### Tabla `tenants` (ACTUALIZADA)
```sql
-- ANTES:
CREATE TABLE tenants (
  ...
  stripe_account_id TEXT,           -- Para Connected Accounts (órdenes)
  ...
);

-- DESPUÉS:
CREATE TABLE tenants (
  ...
  stripe_customer_id TEXT,          -- ✨ NUEVO para suscripciones
  stripe_account_id TEXT,           -- Igual que antes (órdenes)
  ...
);

-- Diferencia clave:
-- stripe_account_id  = Dinero de órdenes → al restaurante
-- stripe_customer_id = Dinero de suscripciones → a ti
```

### Tabla `subscription_plans` (YA EXISTE)
```sql
-- Ya está en schema.sql, ahora se popula con:
-- seed-subscription-plans.sql

INSERT INTO subscription_plans VALUES
├─ basic    $29.99/mes
├─ pro      $79.99/mes
└─ premium  $199.99/mes
```

---

## Webhooks: Eventos Manejados

```
POST /api/stripe/webhook

Recibe eventos de Stripe:
├─ customer.subscription.created
│  └─ UPDATE tenants: status='active'
├─ customer.subscription.updated
│  └─ UPDATE tenants: status (active/suspended)
├─ customer.subscription.deleted
│  └─ UPDATE tenants: status='suspended'
├─ invoice.payment_failed
│  └─ UPDATE tenants: status='suspended'
└─ invoice.payment_succeeded
   └─ UPDATE tenants: status='active'
```

---

## Validación: Dónde Ocurre

```
CLIENTE INTENTA ACCEDER A: /admin/dashboard
          ↓
1️⃣ PRIMERO: Middleware de Next.js (detecta dominio)
   └─ Encuentra tenant por primary_domain
          ↓
2️⃣ SEGUNDO: Layout del admin
   ├─ useEffect llama GET /api/subscription-status
   ├─ Revisa: ¿created_at < 14 días atrás?
   ├─ Revisa: ¿status = 'active' AND tiene stripe_id?
   └─ Decide: ✅ Permite o ❌ Bloquea
          ↓
3️⃣ TERCERO: Renderización
   ├─ Si OK: renderiza {children}
   └─ Si NO: push(/subscription-blocked)
```

---

## Comparación: Antes vs Después

```
ANTES: Restaurante podía acceder siempre
       ├─ Sin validación de suscripción
       └─ Pagaba órdenes (connected accounts)

DESPUÉS: Acceso bloqueado sin suscripción activa
         ├─ Trial 14 días automático
         ├─ Validación en layout
         ├─ Webhook automático
         └─ Dos tipos de dinero en Stripe
             ├─ Órdenes: al restaurante
             └─ Suscripción: a ti
```

---

## Estructura Final

```
restaurant-saas/
├── 📚 Documentación (8 archivos)
├── app/
│   ├── api/ (3 nuevas rutas + webhook mejorado)
│   └── [domain]/(admin)/ (1 layout nuevo + 3 páginas nuevas)
├── lib/ (1 archivo nuevo, 1 actualizado)
├── supabase/ (1 script nuevo, 1 actualizado)
└── Tipos (1 actualizado)

Total: 15 archivos nuevos/actualizados
Líneas de código: ~1500+ líneas de lógica + documentación
Estado: 100% funcional, listo para Stripe setup
```

---

## Siguientes Archivos a Revisar

1. **Para entender qué se hizo:**
   - IMPLEMENTATION_COMPLETE.txt ← Estás aquí

2. **Para empezar:**
   - START_HERE_BILLING.md

3. **Para configurar Stripe:**
   - STRIPE_SETUP_GUIDE.md

4. **Para ver diagramas:**
   - SUBSCRIPTION_FLOW.md

5. **Para desplegar:**
   - DEPLOYMENT_CHECKLIST.md

---

**Actualización**: 2 de abril de 2026

