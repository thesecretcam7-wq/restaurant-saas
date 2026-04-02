# Flujo Visual: Sistema de Facturación Mensual

## 1. REGISTRO A ACCESO (Con Período de Prueba)

```
┌─────────────────────────────────────────────────────┐
│ USUARIO REGISTRA NUEVO RESTAURANTE                  │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
         POST /api/auth/register
                 │
                 ▼
    ┌──────────────────────────┐
    │ Crear Auth User          │
    │ Crear Tenant (status:    │
    │   'trial')               │
    │ created_at = NOW()       │
    └────────────┬─────────────┘
                 │
                 ▼
    ┌──────────────────────────────────┐
    │ ✅ ACCESO AL ADMIN = PERMITIDO   │
    │ (Período de prueba 14 días)      │
    │ Banner: "14 días restantes"      │
    └──────────────┬───────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
     (Día 8)            (Día 16)
        │                     │
        ▼                     ▼
    ✅ Acceso OK        ❌ Acceso Bloqueado
    (6 días left)       Redirige a:
                        /subscription-blocked
```

---

## 2. VALIDACIÓN DE SUSCRIPCIÓN EN LAYOUT

```
┌─────────────────────────────────────────────────────┐
│ USUARIO INTENTA ACCEDER A /admin/dashboard          │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
     app/[domain]/(admin)/layout.tsx
            (useEffect)
                 │
                 ▼
    GET /api/subscription-status?domain=...
                 │
                 ▼
    ┌───────────────────────────┐
    │ Buscar tenant por dominio │
    │ Calcular días desde trial │
    │ Verificar status=active   │
    │ Verificar tiene subscription_stripe_id
    └────────────┬──────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   ✅ ACTIVO          ❌ INACTIVO
   (status: 'active' (trial vencido o
    + plan + stripe_id) no tiene suscripción)
        │                 │
        ▼                 ▼
   Renderiza          Redirige a
   {children}      /subscription-blocked
   (dashboard)    (/admin/subscription-blocked)
```

---

## 3. PÁGINA DE BLOQUEO (sin suscripción)

```
┌──────────────────────────────────────────────────────┐
│ /subscription-blocked                                │
└────────────────┬─────────────────────────────────────┘
                 │
                 ▼
   ┌─────────────────────────────────────┐
   │ ¿Está en período de prueba?         │
   └────────┬──────────────────┬─────────┘
            │                  │
          SÍ (7 días)        NO (vencido/
            │                 no tiene)
            ▼                  ▼
   ┌──────────────────┐  ┌──────────────────┐
   │ Mostrar:         │  │ Mostrar:         │
   │ 🎉 Trial activo  │  │ 🔒 Se requiere   │
   │ X días left      │  │ suscripción      │
   │ [Ir a dashboard] │  │ [Ver Planes]     │
   │ [Ver planes]     │  │ [Volver a inicio]│
   └──────────────────┘  └──────────────────┘
```

---

## 4. FLUJO DE COMPRA DE SUSCRIPCIÓN

```
┌─────────────────────────────────────────────────────┐
│ USUARIO SELECCIONA UN PLAN EN /configuracion/planes │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
   GET /api/subscription-plans
   (Obtiene lista de planes)
                 │
                 ▼
   ┌────────────────────────┐
   │ Usuario selecciona:    │
   │ □ Basic $29.99/mes    │
   │ □ Pro $79.99/mes      │
   │ ✓ Premium $199.99/mes │
   └────────┬───────────────┘
            │
            ▼
   POST /api/stripe/subscription
   {tenantId, planName: 'premium'}
            │
            ▼
   ┌─────────────────────────────────────┐
   │ ¿Existe stripe_customer_id?         │
   └───────┬─────────────────────┬───────┘
           │                     │
          NO                   SÍ
           │                     │
           ▼                     ▼
   stripe.customers.create  Usar customer_id
   (email, metadata)        existente
           │                     │
           └──────────┬──────────┘
                      │
                      ▼
          stripe.checkout.sessions.create
          (customer, line_items, metadata)
                      │
                      ▼
         ┌────────────────────────────────┐
         │ Retorna:                       │
         │ - sessionId                    │
         │ - url (Stripe Checkout URL)    │
         └────────┬───────────────────────┘
                  │
                  ▼
        window.location.href = url
        (Redirige a Stripe Checkout)
                  │
                  ▼
        ┌──────────────────────────┐
        │ STRIPE CHECKOUT         │
        │ Ingresar tarjeta        │
        │ (Billig address, etc)   │
        └────────┬────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ✅ PAGO OK      ❌ PAGO RECHAZADO
        │                 │
        ▼                 ▼
   webhook:         webhook:
   checkout.session invoice.payment_failed
   .completed       (suspender tenant)
        │
        ▼
   tenants UPDATE:
   status = 'active'
   subscription_stripe_id = sub_...
   subscription_plan = 'premium'
        │
        ▼
   Próximo acceso a admin:
   ✅ PERMITIDO
   (Sin banner de trial)
```

---

## 5. CICLO DE VIDA DEL TENANT

```
┌──────────────────────────────────────────────────────┐
│                 TIMELINE DE UN TENANT                │
└──────────────────────────────────────────────────────┘

Día 0: Registra
└─ Status: 'trial'
└─ created_at: 2026-04-02
└─ subscription_plan: null
└─ Acceso: ✅ PERMITIDO

Día 7: Accede al admin
└─ Valida: 7 < 14? Sí
└─ Banner: "7 días restantes"
└─ Acceso: ✅ PERMITIDO

Día 14: Intenta acceder
└─ Valida: 14 < 14? No
└─ Redirige a /subscription-blocked
└─ Acceso: ❌ BLOQUEADO

Día 14 (después): Ve planes, selecciona
└─ POST /api/stripe/subscription
└─ Redirige a Stripe Checkout
└─ Completa pago
└─ Webhook ejecuta:
   └─ Status = 'active'
   └─ subscription_plan = 'pro'
   └─ subscription_stripe_id = sub_...

Día 15: Intenta acceder nuevamente
└─ Valida: Status = 'active'? Sí
└─ Redirige a dashboard
└─ Acceso: ✅ PERMITIDO (sin trial)

┌─ Próximo mes (Día 45):
└─ Stripe intenta cobrar automáticamente
└─ Si éxito → continúa activo
└─ Si fracaso → webhook -> status = 'suspended'
   └─ Próximo acceso bloqueado nuevamente
```

---

## 6. MANEJO DE WEBHOOKS

```
STRIPE → POST /api/stripe/webhook

├─ Evento: customer.subscription.created
│  └─ Extrae tenant_id de metadata
│  └─ UPDATE tenants: status='active', plan, stripe_id
│  └─ ✅ Tenant accede inmediatamente
│
├─ Evento: customer.subscription.updated
│  ├─ Si status='active' → UPDATE status='active'
│  └─ Si status='past_due' → UPDATE status='suspended'
│
├─ Evento: customer.subscription.deleted
│  └─ UPDATE: status='suspended', plan=null
│  └─ ❌ Próximo acceso bloqueado
│
├─ Evento: invoice.payment_failed
│  └─ UPDATE status='suspended'
│  └─ ❌ Acceso bloqueado
│
└─ Evento: invoice.payment_succeeded
   └─ UPDATE status='active'
   └─ ✅ Acceso desbloqueado
```

---

## 7. PUNTOS DE VALIDACIÓN CLAVE

```
┌─────────────────────────────────────────────┐
│ CUANDO USUARIO INTENTA ACCEDER A /admin     │
└─────────┬───────────────────────────────────┘
          │
          ▼
    ┌─────────────────────────────────┐
    │ Layout ejecuta useEffect()       │
    │ Llama /api/subscription-status   │
    └──────────────┬──────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   CONDICIÓN 1:          CONDICIÓN 2:
   ¿Es trial?            ¿Status = active?
        │                     │
        ▼                     ▼
   14 días?          ¿Tiene suscripción?
        │                     │
     <14: ✅            Sí: ✅
     ≥14: ❌            No: ❌
        │                     │
        └──────────┬──────────┘
                   │
            ┌──────▼──────┐
            │ Ambos ✅    │
            │ Acceso OK   │
            └─────────────┘
                   │
            Alguno ❌
                   │
                   ▼
         Redirige a /subscription-blocked
```

---

## 8. DIFERENCIA: TRIAL vs ACTIVO vs SUSPENDIDO

```
┌─────────────┬──────────────┬────────────────────┐
│   ESTADO    │  CAN ACCESS  │   WHAT SHOWS       │
├─────────────┼──────────────┼────────────────────┤
│ trial       │ ✅ YES       │ Dashboard + banner │
│ (< 14 días) │              │ "X días left"      │
├─────────────┼──────────────┼────────────────────┤
│ active      │ ✅ YES       │ Dashboard normal   │
│ (paid)      │              │ Plan: Pro, etc     │
├─────────────┼──────────────┼────────────────────┤
│ suspended   │ ❌ NO        │ /subscription-     │
│ (expired)   │              │ blocked page       │
├─────────────┼──────────────┼────────────────────┤
│ cancelled   │ ❌ NO        │ /subscription-     │
│             │              │ blocked page       │
└─────────────┴──────────────┴────────────────────┘
```

---

## 9. ERRORES Y RECOVERY

```
SCENARIO 1: Webhook no llega
└─ Status no se actualiza
└─ Usuario ve /subscription-blocked
└─ FIX: Verificar logs de Stripe, reintentar webhook manualmente

SCENARIO 2: Pago procesado pero webhook falla
└─ Dinero cobrado en Stripe
└─ Status sigue 'trial'
└─ Usuario sigue bloqueado
└─ FIX: Ejecutar webhook manualmente via Stripe Dashboard

SCENARIO 3: Usuario cancela pero queremos mantener activo
└─ Cancelación = webhook deleted
└─ Status -> 'suspended'
└─ MANUAL: Actualizar directamente en BD o recrear suscripción

SCENARIO 4: Fecha del servidor está mal
└─ Trial cálculo incorrecto
└─ FIX: Verificar timestamp del servidor
```

---

## 10. CAMBIOS EN LA BASE DE DATOS

```
ANTES:
┌─────────────────────────────┐
│ tenants                     │
├─────────────────────────────┤
│ id (UUID)                   │
│ organization_name           │
│ status ('trial', 'active')  │
│ subscription_plan           │
│ subscription_stripe_id      │
│ stripe_account_id (restaurante)
│ stripe_account_status       │
└─────────────────────────────┘

DESPUÉS:
┌──────────────────────────────────┐
│ tenants                          │
├──────────────────────────────────┤
│ id (UUID)                        │
│ organization_name                │
│ status ('trial', 'active')       │
│ subscription_plan                │
│ subscription_stripe_id           │
│ stripe_customer_id ← NUEVO       │
│ stripe_account_id (restaurante)  │
│ stripe_account_status            │
└──────────────────────────────────┘

NOTA: stripe_customer_id es para SUSCRIPCIONES
      stripe_account_id es para PAGOS DE ÓRDENES (no cambió)
```

---

## 11. DINERO FLOW

```
┌─────────────────────────────────────────────┐
│ DINERO DE ÓRDENES (Como antes)              │
├─────────────────────────────────────────────┤
│ Cliente paga por comida                     │
│     ↓                                       │
│ Stripe → Stripe Connected Account           │
│ (del restaurante)                           │
│     ↓                                       │
│ 💰 Dinero directo al restaurante            │
│ (Plataforma NO toma comisión)               │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ DINERO DE SUSCRIPCIONES (NUEVO)             │
├─────────────────────────────────────────────┤
│ Restaurante paga mensualmente                │
│     ↓                                       │
│ Stripe → Tu cuenta (stripe_customer_id)     │
│     ↓                                       │
│ 💰 Dinero a la plataforma                   │
│ (Tu negocio B2B)                            │
└─────────────────────────────────────────────┘

CLAVES:
- Ambos son STRIPE pero cuentas diferentes
- stripe_customer_id = suscripción (tuya)
- stripe_account_id = órdenes (del restaurante)
```

---

## Resumen Visual

```
REGISTRO
   ↓
PERÍODO DE PRUEBA (14 días)
   ├─ ✅ Acceso total
   ├─ 📢 Banner de advertencia
   └─ Timer: 14 → 0 días
   ↓
¿VENCIDO SIN PAGO?
   ├─ ❌ SÍ → Bloqueado
   │   ├─ /subscription-blocked
   │   ├─ "Ver Planes"
   │   └─ Stripe Checkout
   │
   └─ ❌ NO → Continúa probando
       ├─ Dashboard accesible
       └─ Banner: "X días left"
   ↓
SELECCIONA PLAN
   ├─ Stripe Checkout ($29.99+)
   ├─ Procesa pago
   └─ Webhook → actualiza status
   ↓
PAGO EXITOSO
   ├─ Status = 'active'
   ├─ ✅ Acceso ilimitado
   └─ Se renueva cada mes
```

---

*Este diagrama está en MARKDOWN. Para versión visual interactiva, visita Miro o Lucidchart.*

