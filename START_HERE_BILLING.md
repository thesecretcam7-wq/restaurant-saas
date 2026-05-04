# 🚀 COMIENZA AQUÍ: Sistema de Facturación

## ¿Qué acabo de recibir?

Un **sistema completo de facturación mensual** que:
- ✅ Bloquea acceso si restaurante no paga
- ✅ Período de prueba de 14 días gratis
- ✅ Integrado con Stripe
- ✅ Webhooks automáticos

**Estado**: 100% implementado en código, 0% configurado en Stripe.

---

## Flujo Rápido (5 minutos)

```
Tu nueva plataforma pide: ¿Qué restaurante registra?
        ↓
Sistema da: 14 días gratis automáticamente
        ↓
Después de 14 días: Restaurante BLOQUEADO
        ↓
Restaurante paga mensualmente: ACCESO DESBLOQUEADO
```

---

## Pasos Siguientes (En Orden)

### 🟢 PASO 1: LEE ESTO PRIMERO (5 min)
📄 **`README_BILLING.md`**
- Resumen ejecutivo de qué se implementó
- Qué falta por hacer
- Diagrama de dinero (importante!)

### 🟡 PASO 2: COMPRENDE EL FLUJO (10 min)
📊 **`SUBSCRIPTION_FLOW.md`**
- Diagramas visuales de cada etapa
- Cómo funciona la validación
- Estados del tenant

### 🔵 PASO 3: CONFIGURA STRIPE (30 min)
⚙️ **`STRIPE_SETUP_GUIDE.md`**
- Crear productos en Stripe Dashboard
- Crear webhook
- Actualizar variables de entorno
- Paso a paso con checklista

### 🟣 PASO 4: TESTING EN LOCAL (15 min)
- Registra un restaurante
- Espera 15+ días (o edita fecha en BD)
- Intenta acceder → debe bloquear
- Selecciona plan → checkout de Stripe
- Completa pago con tarjeta de prueba
- Verifica que acceso se desbloquea

### 🔴 PASO 5: DESPLEGAR (1 hora)
📋 **`DEPLOYMENT_CHECKLIST.md`**
- Cambiar a claves Stripe live
- Actualizar variables en Vercel
- Test en producción
- Monitoreo

---

## Archivos Importantes

```
PARA LEER:
├─ README_BILLING.md                 ← Empieza aquí
├─ SUBSCRIPTION_FLOW.md              ← Entiende el flujo
├─ STRIPE_SETUP_GUIDE.md             ← Configura Stripe
├─ DEPLOYMENT_CHECKLIST.md           ← Antes de ir live
└─ SUBSCRIPTION_SETUP.md             ← Referencia técnica

CÓDIGO NUEVO:
├─ app/api/stripe/subscription/route.ts
├─ app/api/subscription-status/route.ts
├─ app/api/subscription-plans/route.ts
├─ app/[domain]/(admin)/layout.tsx   ← Valida acceso
├─ app/[domain]/(admin)/subscription-blocked/page.tsx
├─ app/[domain]/(admin)/configuracion/planes/page.tsx
├─ app/[domain]/(admin)/dashboard/page.tsx
├─ lib/subscription.ts
└─ supabase/seed-subscription-plans.sql

DB:
├─ schema.sql (actualizado con stripe_customer_id)
└─ seed-subscription-plans.sql (insertar planes)
```

---

## Tiempo Estimado

| Tarea | Tiempo | Dificultad |
|-------|--------|-----------|
| Leer documentación | 25 min | Fácil |
| Configurar Stripe | 30 min | Medio |
| Testing local | 15 min | Fácil |
| Testing producción | 15 min | Fácil |
| **TOTAL** | **85 min** | **Bajo** |

---

## Lo MÁS Importante Que Entender

### 1. Hay DOS tipos de dinero en Stripe:

**ÓRDENES** (como antes):
- Cliente paga comida → Stripe Connected Account del restaurante
- Dinero directo al restaurante
- Plataforma NO se queda nada

**SUSCRIPCIONES** (NUEVO):
- Restaurante paga mensualmente → Tu cuenta de Stripe
- Dinero para TI (modelo B2B)
- Cada mes, Stripe cobra automáticamente

### 2. El bloqueo es AUTOMÁTICO:

- Restaurante registra → 14 días gratis
- Día 15 → Acceso bloqueado (sin opción)
- Elige plan → Paga → Acceso desbloqueado
- Webhook actualiza estado automáticamente

### 3. No hay período de gracia:

- A diferencia de plataformas como Shopify
- No hay email de advertencia en Día 13
- Simplemente: Día 14 termina → Bloqueado

---

## Preguntas Frecuentes

**P: ¿Qué sucede si Stripe webhook no llega?**
A: El pago se procesa pero status no actualiza. Usuario sigue bloqueado.
Solución: Stripe Dashboard → Webhooks → Reintentar manualmente.

**P: ¿Dónde va el dinero?**
A: A tu cuenta de Stripe (claves sk_live_...).

**P: ¿Los restaurantes pagan directamente a Stripe?**
A: No. Tú procesas el pago a través de tu servidor → Stripe → Tu cuenta.

**P: ¿Puedo cambiar precios después?**
A: Sí. En Stripe Dashboard crea nuevos precios, actualiza precio_id en DB.

**P: ¿Qué pasa si alguien se registra el último día del mes?**
A: Trial es 14 días desde created_at, no calendario.

---

## Comandos Útiles

### Migración BD
```sql
-- Agregar campo
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Insertar planes (con IDs reales)
INSERT INTO subscription_plans (...) VALUES (...);

-- Verificar
SELECT * FROM subscription_plans;
SELECT id, status, subscription_plan, created_at FROM tenants;
```

### Testing Stripe Webhook Local
```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
# Copiar el signing secret
# Actualizar en .env.local
stripe trigger customer.subscription.created
```

### Verificar Webhook en Producción
```
Dashboard.stripe.com → Developers → Webhooks → Seleccionar endpoint → Ver detalles
```

---

## Qué Cambió en el Código

### Nueva Columna en DB
```sql
stripe_customer_id TEXT  -- Para suscripciones (no orders)
```

### Nuevo Layout Admin
El layout ahora valida que:
1. ¿Estás en período de prueba? (< 14 días) → Acceso OK
2. ¿Tienes suscripción activa? → Acceso OK
3. Ninguno de los anteriores → Redirige a /subscription-blocked

### Nuevas APIs
- POST /api/stripe/subscription - Iniciar checkout
- GET /api/subscription-status - Verificar estado
- GET /api/subscription-plans - Listar planes

### Nuevas Páginas
- /subscription-blocked - "Tu suscripción venció, elige un plan"
- /configuracion/planes - "Selecciona tu plan de suscripción"
- /dashboard - "Bienvenido al admin"

---

## Seguridad

✅ Validación en middleware (no se puede saltear)
✅ RLS en BD (cada restaurante solo ve sus datos)
✅ Webhook signature verification (confirma que es Stripe)
✅ No hay hardcoded secrets

---

## Soporte

Si algo no funciona:

1. **Revisa logs de Vercel**: https://vercel.com/dashboard
2. **Revisa Stripe Dashboard**: https://dashboard.stripe.com
3. **Lee SUBSCRIPTION_SETUP.md**: Sección "Troubleshooting"
4. **Contacta**: soporte@restaurantsaas.com

---

## Siguiente Acción

👉 **Lee `README_BILLING.md` ahora** (5 minutos)

Luego sigue los 5 pasos en orden.

---

**Estado**: ✅ Código listo | ⏳ Espera tu configuración de Stripe

