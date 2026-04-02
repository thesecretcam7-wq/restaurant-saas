# Guía: Configurar Stripe para Suscripciones

## Prerrequisitos

- ✅ Cuenta de Stripe activa
- ✅ Acceso a Stripe Dashboard
- ✅ Ambiente de testing (claves sk_test_)

---

## Parte 1: Crear Productos de Suscripción

### Paso 1: Ir a Stripe Dashboard

1. Abre https://dashboard.stripe.com
2. Login con tu cuenta
3. Verifica que estés en modo **Test** (esquina superior derecha)

### Paso 2: Crear Producto "Basic"

1. Click en **Products** en menú lateral
2. Click en **+ Add product**
3. Completa:
   ```
   Name: Basic Plan
   Description: Perfect for getting started
   Image: (optional)
   ```
4. Click **Create product**
5. En la sección **Pricing**:
   - Click **+ Add price**
   - Billing period: **Monthly**
   - Price: **29.99**
   - Currency: **USD** (o tu moneda)
   - Recurring: **Yes**
   - Click **Save price**

6. **COPIAR**:
   - Product ID: `prod_XXXX`
   - Price ID: `price_XXXX`

### Paso 3: Crear Producto "Pro"

Repetir Paso 2 con:
```
Name: Pro Plan
Description: For growing restaurants
Price: 79.99
```

### Paso 4: Crear Producto "Premium"

Repetir Paso 2 con:
```
Name: Premium Plan
Description: Unlimited everything
Price: 199.99
```

---

## Parte 2: Crear Webhook

### Paso 1: Ir a Webhooks

1. Click en **Developers** en menú lateral
2. Click en **Webhooks**
3. Click en **+ Add an endpoint**

### Paso 2: Configurar Endpoint

```
Endpoint URL: https://your-domain.com/api/stripe/webhook
(Si estás en dev local: usa ngrok o Stripe CLI para testing)
```

### Paso 3: Seleccionar Eventos

Click en **Select events** y agrega estos:

```
✅ customer.subscription.created
✅ customer.subscription.updated
✅ customer.subscription.deleted
✅ invoice.payment_failed
✅ invoice.payment_succeeded
✅ account.updated
```

### Paso 4: Crear Webhook

1. Click **Add endpoint**
2. Serás redirigido a detalles del webhook
3. **COPIAR**: `Signing secret`: `whsec_XXXX`

---

## Parte 3: Actualizar Variables de Entorno

### En Local (.env.local)

```env
STRIPE_SECRET_KEY=sk_test_XXXX...       # Ya tienes
STRIPE_WEBHOOK_SECRET=whsec_XXXX...     # Actualizar con secret del webhook
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### En Vercel

1. Proyecto → Settings → Environment Variables
2. Busca `STRIPE_WEBHOOK_SECRET`
3. Actualiza con el secret copiado
4. Redeploy

---

## Parte 4: Actualizar Base de Datos

### Paso 1: Ejecutar Migración

En Supabase SQL Editor:

```sql
-- Agregar columna si no existe
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
```

### Paso 2: Insertar Planes

En Supabase SQL Editor, reemplaza los IDs con los que copiaste:

```sql
INSERT INTO subscription_plans (name, monthly_price, features, stripe_product_id, stripe_price_id)
VALUES
  (
    'basic',
    29.99,
    '{
      "max_products": 100,
      "orders_per_month": 1000,
      "categories": 10,
      "support": "email",
      "delivery": true,
      "reservations": true,
      "custom_domain": false
    }'::jsonb,
    'prod_1234567890ABC',  -- Reemplazar con ID real
    'price_1234567890DEF'  -- Reemplazar con ID real
  ),
  (
    'pro',
    79.99,
    '{
      "max_products": 500,
      "orders_per_month": 10000,
      "categories": 50,
      "support": "priority_email",
      "delivery": true,
      "reservations": true,
      "custom_domain": true,
      "analytics": true
    }'::jsonb,
    'prod_2345678901ABC',  -- Reemplazar con ID real
    'price_2345678901DEF'  -- Reemplazar con ID real
  ),
  (
    'premium',
    199.99,
    '{
      "max_products": "unlimited",
      "orders_per_month": "unlimited",
      "categories": "unlimited",
      "support": "24/7_phone",
      "delivery": true,
      "reservations": true,
      "custom_domain": true,
      "analytics": true,
      "api_access": true,
      "dedicated_support": true
    }'::jsonb,
    'prod_3456789012ABC',  -- Reemplazar con ID real
    'price_3456789012DEF'  -- Reemplazar con ID real
  )
ON CONFLICT (name) DO UPDATE SET
  monthly_price = EXCLUDED.monthly_price,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id;
```

### Paso 3: Verificar

```sql
SELECT * FROM subscription_plans ORDER BY monthly_price;
```

Deberías ver 3 filas con tus IDs de Stripe.

---

## Parte 5: Testing

### Test Localmente con Stripe CLI

#### 1. Instalar Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
choco install stripe-cli

# Linux
curl https://files.stripe.com/stripe-cli/installer.sh -O
bash installer.sh
```

#### 2. Autenticar

```bash
stripe login
# Seguir instrucciones en el navegador
```

#### 3. Escuchar Webhooks

```bash
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
# Copiar el signing secret que aparece
# Actualizar en .env.local: STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 4. Hacer Test Manual

En otra terminal:

```bash
# Simular evento de suscripción creada
stripe trigger customer.subscription.created

# Simular pago fallido
stripe trigger invoice.payment_failed

# Ver más eventos disponibles
stripe trigger --help
```

### Test en Navegador

1. Abre `http://localhost:3000`
2. Registra restaurante nuevo
3. Intenta acceder a `/admin/dashboard`
4. Debería funcionar (trial activo)
5. Ve a `/admin/configuracion/planes`
6. Selecciona plan
7. En Stripe Checkout, usa:
   - Email: `test@example.com`
   - Tarjeta: `4242 4242 4242 4242`
   - Mes: cualquiera en el futuro
   - CVC: `123`
8. Click "Pay"
9. Verifica:
   - Webhook aparece en Stripe CLI logs
   - `tenants` se actualizó: `status='active'`
   - Acceso al dashboard funciona sin trial

---

## Parte 6: Ir a Producción

### Cambios Requeridos

#### 1. Cambiar a Claves Live

```
STRIPE_SECRET_KEY=sk_live_XXXX...     (nueva clave)
STRIPE_WEBHOOK_SECRET=whsec_XXXX...  (nuevo webhook producción)
```

#### 2. Duplicar Productos en Producción

1. En Stripe Dashboard, cambiar a **Live** (esquina superior derecha)
2. Repetir creación de productos (Basic, Pro, Premium)
3. Copiar IDs live: `prod_live_XXXX`

#### 3. Crear Webhook en Producción

1. En Dashboard Live, ir a **Developers** → **Webhooks**
2. Crear nuevo webhook (mismo proceso)
3. Usar URL de producción: `https://your-domain.com/api/stripe/webhook`
4. Copiar nuevo secret: `whsec_live_XXXX`

#### 4. Actualizar BD con IDs Live

```sql
UPDATE subscription_plans SET
  stripe_product_id = 'prod_live_...',
  stripe_price_id = 'price_live_...'
WHERE name = 'basic';

UPDATE subscription_plans SET
  stripe_product_id = 'prod_live_...',
  stripe_price_id = 'price_live_...'
WHERE name = 'pro';

UPDATE subscription_plans SET
  stripe_product_id = 'prod_live_...',
  stripe_price_id = 'price_live_...'
WHERE name = 'premium';
```

#### 5. Actualizar Variables en Vercel

1. Proyecto → Settings → Environment Variables
2. Actualizar:
   - `STRIPE_SECRET_KEY` → `sk_live_...`
   - `STRIPE_WEBHOOK_SECRET` → `whsec_live_...`
3. Redeploy

### Test en Producción

⚠️ **IMPORTANTE**: Aún puedes usar tarjetas de prueba en producción:
- `4242 4242 4242 4242` (éxito)
- `4000 0000 0000 0002` (rechazado)
- etc.

O usa una **tarjeta real si estás seguro**.

---

## Checklista Final

- [ ] Productos creados en Stripe (Basic, Pro, Premium)
- [ ] IDs de productos copiados (`prod_...`)
- [ ] IDs de precios copiados (`price_...`)
- [ ] Webhook creado y endpoint configurado
- [ ] Signing secret copiado (`whsec_...`)
- [ ] `.env.local` actualizado
- [ ] Vercel variables de entorno actualizadas
- [ ] Base de datos migrada (`stripe_customer_id` agregado)
- [ ] Planes insertados en `subscription_plans`
- [ ] Test local funciona (registro → trial → bloqueo → pago)
- [ ] Webhooks se procesan correctamente (verificar Stripe logs)
- [ ] Variables live configuradas en Vercel
- [ ] Test en producción exitoso

---

## Troubleshooting

### "Webhook no recibe eventos"

```bash
# En terminal con stripe listen:
# Verifica que te muestra "Ready! Your webhook signing secret is: whsec_..."
# Si no ves eventos entrantes, el endpoint URL es incorrecto

# Solución:
1. Verificar URL en Stripe Dashboard es correcta
2. Usar ngrok si estás en local
3. Revisar logs de Vercel por errores 500
```

### "Payment Intent error en Stripe Checkout"

```
Error: No such price
Causa: stripe_price_id incorrecto o no existe
Solución: Verificar que copiaste el ID correcto en DB
```

### "No puedo hacer test checkout local"

```
Causa: Webhook secret incorrecto
Solución:
1. stripe listen --forward-to http://localhost:3000/api/stripe/webhook
2. Copiar nuevo secret
3. Actualizar .env.local
4. Reiniciar servidor
```

---

## Referencias

- Docs de Stripe: https://stripe.com/docs/billing/subscriptions
- Stripe CLI: https://stripe.com/docs/stripe-cli
- Testing Guide: https://stripe.com/docs/testing

---

**Pasos completados**: Ahora puedes aceptar pagos de suscripción.
**Próximo paso**: Implementar cancelaciones y upgrades (opcional).

