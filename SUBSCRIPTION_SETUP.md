# Configuración de Suscripciones B2B

## Descripción General

Este documento explica cómo está implementado el sistema de facturación mensual para restaurantes en el SaaS.

### Características Principales

1. **Período de Prueba Gratuito**: 14 días sin costo
2. **Bloqueo Automático**: Acceso bloqueado si la suscripción no está activa
3. **Tres Planes Disponibles**: Basic ($29.99/mes), Pro ($79.99/mes), Premium ($199.99/mes)
4. **Validación en Middleware**: Todas las rutas admin validan estado de suscripción
5. **Webhooks de Stripe**: Actualización automática de estados

---

## Estructura de la Implementación

### Base de Datos

#### Campo añadido a `tenants`:
```sql
stripe_customer_id TEXT  -- ID del cliente en Stripe para las suscripciones
```

#### Tabla `subscription_plans`:
Contiene los tres planes disponibles con sus características y precios de Stripe.

### APIs Creadas

#### 1. `POST /api/stripe/subscription`
Inicia el proceso de suscripción. Crea un cliente en Stripe si no existe y genera una sesión de Stripe Checkout.

**Parámetros:**
```json
{
  "tenantId": "uuid",
  "planName": "basic" | "pro" | "premium"
}
```

**Respuesta:**
```json
{
  "success": true,
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### 2. `GET /api/subscription-status`
Verifica el estado de la suscripción de un restaurante.

**Parámetros Query:**
- `domain`: El dominio del restaurante

**Respuesta:**
```json
{
  "hasActiveSubscription": true,
  "status": "active",
  "plan": "pro",
  "isTrialActive": false,
  "trialDaysLeft": 0,
  "tenantId": "uuid"
}
```

#### 3. `GET /api/subscription-plans`
Obtiene todos los planes disponibles.

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "name": "basic",
    "monthly_price": 29.99,
    "features": { ... },
    "stripe_product_id": "prod_...",
    "stripe_price_id": "price_..."
  },
  ...
]
```

### Componentes Frontend

#### 1. Layout Admin (`app/[domain]/(admin)/layout.tsx`)
- Valida suscripción en cada acceso a rutas admin
- Muestra banner de advertencia si está en período de prueba
- Redirige a página de bloqueo si no hay suscripción activa

#### 2. Página de Bloqueo (`app/[domain]/(admin)/subscription-blocked/page.tsx`)
- Muestra estado del período de prueba (si activo)
- Permite navegar a configuración de planes
- Redirige al dashboard si suscripción se activa

#### 3. Página de Planes (`app/[domain]/(admin)/configuracion/planes/page.tsx`)
- Muestra los tres planes disponibles
- Permite seleccionar plan y proceder a pago
- Redirige a Stripe Checkout

### Webhooks de Stripe

Se procesan los siguientes eventos:

1. **`customer.subscription.created`**: Activa el tenant y guarda la suscripción
2. **`customer.subscription.updated`**: Actualiza estado (activo/suspendido)
3. **`customer.subscription.deleted`**: Suspende el tenant
4. **`invoice.payment_failed`**: Suspende el tenant
5. **`invoice.payment_succeeded`**: Activa el tenant después de pago exitoso

---

## Flujo de Suscripción

```
1. Nuevo Restaurante Registra
   ↓
2. Status = 'trial' (14 días gratis)
   ↓
3. Intenta acceder a admin después de 14 días
   ↓
4. Layout admin valida suscripción
   ↓
5. Si no activa → Redirige a /subscription-blocked
   ↓
6. Usuario puede ver planes en /configuracion/planes
   ↓
7. Selecciona plan → POST /api/stripe/subscription
   ↓
8. Redirige a Stripe Checkout
   ↓
9. Pago exitoso → webhook actualiza tenant
   ↓
10. Status = 'active' → Acceso desbloqueado
```

---

## Estados del Tenant

- **`trial`**: Período de prueba (14 días)
- **`active`**: Suscripción pagada y activa
- **`suspended`**: Suscripción vencida o pago fallido
- **`cancelled`**: Suscripción cancelada por usuario

## Transiciones Automáticas

| Evento | Estado Anterior | Estado Nuevo |
|--------|---|---|
| Registro | N/A | `trial` |
| Pago exitoso | `trial` / `suspended` | `active` |
| Pago fallido | `active` | `suspended` |
| Suscripción cancelada | `active` | `cancelled` |
| Período de prueba vencido | `trial` | Valida en acceso |

---

## Configuración de Stripe

### Pasos Obligatorios

1. **Crear Productos en Stripe Dashboard**:
   - Producto "Basic" ($29.99/mes)
   - Producto "Pro" ($79.99/mes)
   - Producto "Premium" ($199.99/mes)

2. **Copiar IDs**:
   - Guardar `stripe_product_id` de cada producto
   - Guardar `stripe_price_id` de cada precio

3. **Actualizar Base de Datos**:
   ```sql
   -- Ejecutar seed-subscription-plans.sql con IDs reales
   UPDATE subscription_plans SET
     stripe_product_id = 'prod_XXXX',
     stripe_price_id = 'price_XXXX'
   WHERE name = 'basic';
   ```

4. **Configurar Webhook en Stripe**:
   - Endpoint: `https://your-domain/api/stripe/webhook`
   - Eventos:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
     - `invoice.payment_succeeded`
     - `account.updated`
   - Guardar webhook secret en `STRIPE_WEBHOOK_SECRET`

---

## Variables de Entorno Necesarias

```
STRIPE_SECRET_KEY=sk_test_...        # Ya configurada
STRIPE_WEBHOOK_SECRET=whsec_...      # Necesita actualizar
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Para URLs de éxito/cancelación
```

---

## Lógica de Bloqueo

### Cuándo se Bloquea el Acceso

1. Período de prueba vencido (14 días)
2. Suscripción expirada o cancelada
3. Pago fallido

### Cómo se Valida

El layout admin:
1. Obtiene status de `/api/subscription-status`
2. Verifica `hasActiveSubscription: true`
3. Si falso, redirige a `/subscription-blocked`

### Excepciones

- **Período de Prueba**: Muestra advertencia pero permite acceso
- **Pago en Proceso**: Se actualiza automáticamente con webhook

---

## Testing

### Modo Desarrollo

1. Usar claves de prueba de Stripe (sk_test_...)
2. Usar tarjetas de prueba: `4242 4242 4242 4242`
3. Los webhooks se pueden simular desde Stripe Dashboard

### Tarjetas de Prueba

- **Pago exitoso**: `4242 4242 4242 4242`
- **Pago rechazado**: `4000 0000 0000 0002`
- **Requiere autenticación**: `4000 0025 0000 3155`

---

## Monitoreo

### Qué Verificar

1. **Webhooks**: `https://dashboard.stripe.com/webhooks`
   - Verificar entregas exitosas
   - Revisar errores o reintents

2. **Base de Datos**:
   ```sql
   SELECT id, status, subscription_plan, created_at FROM tenants
   WHERE status = 'active' LIMIT 10;
   ```

3. **Logs de Aplicación**:
   - Errores en `/api/stripe/subscription`
   - Fallos en validación de suscripción

---

## Solución de Problemas

### "El restaurante no puede acceder al admin"

1. Verificar `tenants.status` en DB
2. Verificar `subscription_stripe_id` no es NULL
3. Revisar webhook de Stripe en últimos 15 min
4. Verificar período de prueba no ha vencido

### "Stripe Checkout muestra error"

1. Verificar `stripe_price_id` válido en `subscription_plans`
2. Verificar cliente de Stripe creado correctamente
3. Revisar logs de Stripe Dashboard
4. Verificar webhook secret en `.env.local`

### "Suscripción no actualiza después del pago"

1. Verificar webhook endpoint recibe POST
2. Verificar signature validation pasa
3. Revisar metadata en evento de Stripe
4. Verificar tenant.id existe en DB

---

## Mejoras Futuras

- [ ] Email de recordatorio antes de vencer período de prueba
- [ ] Dashboard de facturación para admin
- [ ] Descuentos y cupones
- [ ] Facturación anual con descuento
- [ ] Upgrade/downgrade entre planes
- [ ] Historial de transacciones
- [ ] Integración con contabilidad

