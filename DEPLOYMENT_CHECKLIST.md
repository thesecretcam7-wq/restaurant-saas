# Checklist de Despliegue: Sistema de Suscripciones

## Antes de Desplegar

### Stripe Configuration
- [ ] Crear 3 productos en Stripe Dashboard:
  - [ ] "Basic" - $29.99/mes
  - [ ] "Pro" - $79.99/mes
  - [ ] "Premium" - $199.99/mes
- [ ] Copiar `stripe_product_id` de cada producto
- [ ] Copiar `stripe_price_id` de cada precio mensual
- [ ] Crear Webhook en Stripe:
  - [ ] Endpoint: `https://your-domain.com/api/stripe/webhook`
  - [ ] Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
  - [ ] Copiar `STRIPE_WEBHOOK_SECRET`

### Base de Datos
- [ ] Ejecutar migración para agregar `stripe_customer_id`:
  ```sql
  ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;
  ```
- [ ] Ejecutar seed con IDs reales (actualizar IDs en seed-subscription-plans.sql):
  ```sql
  -- Reemplazar prod_XXXX y price_XXXX con IDs reales
  INSERT INTO subscription_plans (...) VALUES (...);
  ```
- [ ] Verificar planes insertados:
  ```sql
  SELECT * FROM subscription_plans;
  ```

### Código
- [ ] Revisar `.env.local`:
  ```
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...  ← ACTUALIZAR
  NEXT_PUBLIC_APP_URL=http://localhost:3000 (o tu dominio)
  ```
- [ ] Revisar URLs de Stripe Checkout en `/api/stripe/subscription`:
  - [ ] `success_url` apunta a dashboard
  - [ ] `cancel_url` apunta a /configuracion/planes

### Testing Local
- [ ] Instalar dependencias: `npm install`
- [ ] Iniciar servidor: `npm run dev`
- [ ] Probar período de prueba:
  - [ ] Registrar nuevo restaurante
  - [ ] Acceder a `/admin/dashboard` (debería funcionar)
- [ ] Probar bloqueo post-trial:
  - [ ] Cambiar `created_at` en BD para simular 15+ días
  - [ ] Acceder a `/admin/dashboard` (debería redirigir)
  - [ ] Verificar que aparece `/subscription-blocked`
- [ ] Probar compra:
  - [ ] Click en "Ver Planes"
  - [ ] Seleccionar plan
  - [ ] Verificar redirect a Stripe Checkout
  - [ ] Usar tarjeta `4242 4242 4242 4242`
  - [ ] Pago completado → Verificar webhook en Stripe logs
  - [ ] Acceso desbloqueado después del webhook

---

## Despliegue a Producción

### Pre-Deployment
- [ ] Cambiar Stripe keys a producción (live keys)
  ```
  STRIPE_SECRET_KEY=sk_live_...
  STRIPE_WEBHOOK_SECRET=whsec_... (webhook de producción)
  ```
- [ ] Crear Webhook en Stripe producción (similar a testing)
- [ ] Duplicar plans en Stripe producción
- [ ] Actualizar `subscription_plans` en BD de producción
- [ ] Revisar variables de entorno en Vercel

### Deployment
- [ ] Hacer commit de cambios:
  ```bash
  git add -A
  git commit -m "feat: subscription billing system"
  ```
- [ ] Push a main (si auto-deploy está configurado)
- [ ] O desplegar manualmente en Vercel
- [ ] Esperar a que build complete
- [ ] Revisar logs de Vercel por errores

### Post-Deployment Checks
- [ ] [ ] Acceder a sitio en producción
- [ ] [ ] Registrar restaurante de prueba
- [ ] [ ] Verificar acceso admin sin período de prueba
- [ ] [ ] Simular fin de período de prueba
- [ ] [ ] Verificar bloqueo funciona
- [ ] [ ] Realizar compra de plan (con Stripe live, usa test card)
- [ ] [ ] Verificar webhook se procesa
- [ ] [ ] Verificar tenant actualizado en BD

---

## Monitoreo Continuo

### Diariamente
- [ ] Revisar Stripe Dashboard:
  - [ ] Nuevas suscripciones creadas
  - [ ] Webhooks entregados exitosamente
  - [ ] Pagos fallidos o intentos de retry
- [ ] Revisar logs de Vercel por errores 500

### Semanalmente
- [ ] Ejecutar query de control:
  ```sql
  -- Contar tenants en cada estado
  SELECT status, subscription_plan, COUNT(*)
  FROM tenants
  GROUP BY status, subscription_plan;
  ```
- [ ] Verificar ingresos en Stripe

### Mensualmente
- [ ] Revisar métricas:
  - Tasa de conversión (trial → paid)
  - Churn rate (cancelaciones)
  - Plan más popular
- [ ] Revisar webhook failures en Stripe
- [ ] Backup de datos críticos

---

## Troubleshooting Rápido

### "Período de prueba no funciona"
```bash
# Verificar created_at en tenants
SELECT id, organization_name, created_at FROM tenants LIMIT 1;

# Verificar que /api/subscription-status devuelve datos correctos
curl "http://localhost:3000/api/subscription-status?domain=localhost:3000"
```

### "Bloqueo no funciona"
- [ ] Verificar que layout.tsx está en ruta correcta
- [ ] Revisar network tab en DevTools
- [ ] Verificar respuesta de `/api/subscription-status`

### "Stripe Checkout no carga"
- [ ] Verificar `stripe_price_id` en subscription_plans
- [ ] Verificar que los precios existen en Stripe
- [ ] Revisar console.error en DevTools

### "Webhook no actualiza status"
- [ ] Verificar STRIPE_WEBHOOK_SECRET correcto
- [ ] Ver Stripe Dashboard → Webhooks → Delivery attempts
- [ ] Verificar metadata incluye `tenant_id`
- [ ] Verificar logs de Vercel por errores en webhook handler

---

## Rollback (Si Algo Falla)

### Opción 1: Revert de Git
```bash
git revert [commit-hash]
git push
# Vercel auto-deploys
```

### Opción 2: Manual Fix
- [ ] Si planes no existen en Stripe: comentar Stripe en código temporalmente
- [ ] Si webhooks fallan: deshabilitar validación temporal
- [ ] Si DB está corrupta: restaurar backup (Supabase)

### Verificar Rollback
```bash
# Confirmar que período de prueba no se valida
# Acceder a /admin debería funcionar
# Verificar logs de Vercel están limpios
```

---

## Contacts para Soporte

- **Stripe Support**: dashboard.stripe.com/support
- **Supabase Support**: supabase.com/support
- **Vercel Support**: vercel.com/support
- **Tu Email**: contacto@restaurantsaas.com

---

## Notas Importantes

⚠️ **No olvides**:
- Actualizar STRIPE_WEBHOOK_SECRET en Vercel
- Usar test cards cuando estés en modo testing
- Monitorear primeras transacciones
- Tener plan de rollback listo

✅ **Antes de anunciar a usuarios**:
- Probar flujo completo (registro → trial → bloqueo → pago)
- Verifica webhooks funcionan
- Confirma que dinero llega a tu cuenta de Stripe

