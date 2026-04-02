# Quick Reference Card

## Configuración Rápida: 3 Pasos

### PASO 1: Stripe Dashboard (15 min)
```
1. dashboard.stripe.com → Products
2. + Add Product
   ├─ Name: "Basic Plan"
   ├─ Price: $29.99
   ├─ Recurrence: Monthly
   └─ COPIAR: prod_XXXX y price_XXXX
3. Repetir para "Pro" ($79.99) y "Premium" ($199.99)

4. Developers → Webhooks → + Add Endpoint
   ├─ URL: https://your-domain.com/api/stripe/webhook
   ├─ Events: customer.subscription.* + invoice.payment.*
   └─ COPIAR: whsec_XXXX
```

### PASO 2: Variables de Entorno (5 min)
```bash
# .env.local
STRIPE_WEBHOOK_SECRET=whsec_XXXX

# Vercel → Settings → Environment Variables
STRIPE_WEBHOOK_SECRET=whsec_XXXX
```

### PASO 3: Base de Datos (5 min)
```sql
-- Migración
ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;

-- Datos (reemplaza IDs)
INSERT INTO subscription_plans VALUES
  ('basic', 29.99, {...}, 'prod_...', 'price_...'),
  ('pro', 79.99, {...}, 'prod_...', 'price_...'),
  ('premium', 199.99, {...}, 'prod_...', 'price_...');
```

---

## Validación: Pseudocódigo

```javascript
// En /[domain]/(admin)/layout.tsx

useEffect(() => {
  const status = fetch('/api/subscription-status')

  if (!status.hasActiveSubscription) {
    // Redirige a bloqueo
    router.push('/subscription-blocked')
  }
})
```

---

## Estados del Tenant

| Estado | Días | Acceso | Acción |
|--------|------|--------|--------|
| trial | 0-13 | ✅ | Banner "X días left" |
| trial | 14+ | ❌ | Redirige a bloqueo |
| active | ∞ | ✅ | Sin restricciones |
| suspended | ∞ | ❌ | Redirige a bloqueo |
| cancelled | ∞ | ❌ | Redirige a bloqueo |

---

## API Endpoints Nuevos

```
POST /api/stripe/subscription
└─ Body: {tenantId, planName}
└─ Return: {url: "https://checkout.stripe.com/..."}

GET /api/subscription-status?domain=...
└─ Return: {hasActiveSubscription, status, plan, ...}

GET /api/subscription-plans
└─ Return: [{id, name, price, features, ...}, ...]
```

---

## Webhook Events

```
RECEIVED                      EJECUTA
┌──────────────────────────┬──────────────────────────────┐
│ subscription.created     │ status='active', plan='pro'  │
│ subscription.updated     │ status='active'/'suspended' │
│ subscription.deleted     │ status='suspended'          │
│ invoice.payment_failed   │ status='suspended'          │
│ invoice.payment_succeed  │ status='active'             │
└──────────────────────────┴──────────────────────────────┘
```

---

## Pruebas Locales

```bash
# Terminal 1: Escuchar webhooks
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
# Copiar: signing secret whsec_XXXX
# Actualizar: .env.local STRIPE_WEBHOOK_SECRET

# Terminal 2: Simular evento
stripe trigger customer.subscription.created

# Terminal 3: Dev server
npm run dev
```

---

## Rutas Principales

```
/register                          → Crear restaurante
/[domain]/admin/dashboard          → Panel principal (VALIDADO)
/[domain]/(admin)/subscription-blocked  → Suscripción requerida
/[domain]/(admin)/configuracion/planes  → Seleccionar plan
```

---

## Variables DB Clave

```sql
-- En tabla tenants:
created_at        → Inicio del período de prueba
status            → trial | active | suspended | cancelled
subscription_plan → basic | pro | premium | null
subscription_stripe_id        → ID de suscripción en Stripe
stripe_customer_id            → ID de cliente (NEW)
stripe_account_id             → ID de Connected Account (órdenes)
```

---

## Dinero: ¿A Dónde Va?

```
ÓRDENES:
Cliente paga comida
  ↓
Stripe → stripe_account_id (restaurante)
  ↓
💰 Restaurante recibe dinero

SUSCRIPCIONES:
Restaurante paga mensualidad
  ↓
Stripe → stripe_customer_id (TÚ)
  ↓
💰 TÚ recibes dinero
```

---

## Errores Comunes

| Error | Causa | Fix |
|-------|-------|-----|
| "No such price" | stripe_price_id incorrecto | Verificar en DB |
| Webhook no llega | Secret incorrecto | Verificar whsec_ |
| Acceso no bloqueado | Layout no se ejecuta | Ruta debe estar en (admin) |
| Pago no actualiza | Webhook ignora evento | Ver logs de Stripe |

---

## Checklist Pre-Producción

```
Stripe:
□ 3 productos creados
□ 3 precios creados
□ Webhook creado
□ Webhook secret copiado

Código:
□ STRIPE_WEBHOOK_SECRET actualizado
□ npm run dev funciona
□ APIs responden correctamente

BD:
□ stripe_customer_id agregado
□ Planes insertados con IDs reales
□ Verificado con SELECT

Testing:
□ Registrar restaurante
□ Esperar > 14 días (o editar BD)
□ Ver bloqueo
□ Pagar en Stripe Checkout
□ Webhook ejecutado
□ Acceso desbloqueado

Producción:
□ Claves Stripe live
□ Webhook live configurado
□ Variables Vercel actualizadas
□ Test en staging
```

---

## Números de Referencia

```
Período de prueba: 14 días (hardcoded)
Sin período de gracia: Día 15 = bloqueado
Planes: 3 (Basic, Pro, Premium)
Webhooks a monitorear: 5 eventos

URLs importante:
- Dashboard Stripe: https://dashboard.stripe.com
- Vercel Settings: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard
```

---

## Documentos por Caso de Uso

```
"¿Por dónde empiezo?"
→ START_HERE_BILLING.md

"¿Cómo configuro Stripe?"
→ STRIPE_SETUP_GUIDE.md

"¿Cómo funciona el bloqueo?"
→ SUBSCRIPTION_FLOW.md

"¿Qué cambió en el código?"
→ IMPLEMENTATION_SUMMARY.md

"¿Cómo despliego?"
→ DEPLOYMENT_CHECKLIST.md

"¿Qué se implementó?"
→ IMPLEMENTATION_COMPLETE.txt
```

---

## Atajos Útiles

```bash
# Verificar planes en BD
supabase → SQL Editor → SELECT * FROM subscription_plans;

# Ver tenants
SELECT id, status, subscription_plan, created_at FROM tenants;

# Testing webhook
stripe trigger customer.subscription.created

# Ver logs
vercel logs (en terminal con vercel CLI)
```

---

## Estructura de Webhooks en Código

```typescript
// /api/stripe/webhook/route.ts

switch (event.type) {
  case 'customer.subscription.created':
    → Extrae tenant_id de metadata
    → UPDATE status='active'
    break

  case 'invoice.payment_failed':
    → UPDATE status='suspended'
    break

  // ... más eventos
}
```

---

## Validación del Layout

```typescript
// /[domain]/(admin)/layout.tsx

const subscription = fetch('/api/subscription-status?domain=...')

if (!subscription.hasActiveSubscription) {
  router.push('/subscription-blocked')
}
```

---

## Tiempo Estimado

| Tarea | Tiempo |
|-------|--------|
| Leer documentación | 25 min |
| Crear productos Stripe | 15 min |
| Crear webhook | 5 min |
| Actualizar variables | 5 min |
| Migración BD | 5 min |
| Testing | 20 min |
| **TOTAL** | **75 min** |

---

## Estado Actual

✅ Código: 100% listo
⏳ Configuración: 0% (acción tuya)
🚀 Listo para: Testing en staging

---

**Guarda esta tarjeta para referencia rápida**

