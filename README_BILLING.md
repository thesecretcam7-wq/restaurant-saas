# Sistema de Facturación Mensual: Resumen Ejecutivo

## ¿Qué se implementó?

Un sistema completo de **bloqueo de acceso basado en suscripción mensual** para restaurantes en tu plataforma SaaS.

### Funcionalidades Implementadas ✅

1. **Período de Prueba Gratuito de 14 Días**
   - Cada restaurante nuevo tiene acceso completo sin costo
   - Banner de advertencia mostrando días restantes
   - Después de 14 días, acceso **BLOQUEADO** si no paga

2. **Bloqueo Automático de Acceso**
   - Layout middleware valida suscripción antes de cargar dashboard
   - Si no está pagado o en trial, redirige a página de bloqueo
   - NO se puede saltear el bloqueo

3. **Tres Planes de Suscripción**
   - **Basic**: $29.99/mes (100 productos, 1000 órdenes/mes)
   - **Pro**: $79.99/mes (500 productos, dominio personalizado)
   - **Premium**: $199.99/mes (ilimitado, soporte 24/7, API)

4. **Checkout Integrado con Stripe**
   - Los restaurantes pagan mensualmente a **tu plataforma**
   - NO a través de Stripe Connected Accounts (eso es para órdenes)
   - Dinero va a tu cuenta de Stripe

5. **Webhooks Automáticos**
   - Stripe actualiza estado del tenant automáticamente
   - Pago exitoso → Status 'active' → Acceso permitido
   - Pago fallido → Status 'suspended' → Acceso bloqueado

---

## Archivos Creados

### 🔧 APIs (3 nuevas)
```
✅ /api/stripe/subscription           - Crear suscripción
✅ /api/subscription-status           - Verificar estado
✅ /api/subscription-plans            - Listar planes
```

### 📄 Páginas (2 nuevas)
```
✅ /[domain]/(admin)/subscription-blocked    - Página de bloqueo
✅ /[domain]/(admin)/configuracion/planes    - Seleccionar planes
✅ /[domain]/(admin)/dashboard               - Dashboard (para redirecciones)
```

### 🛡️ Layouts (1 nuevo)
```
✅ /[domain]/(admin)/layout.tsx       - Validación de suscripción
```

### 📚 Librerías
```
✅ lib/subscription.ts                - Utilidades de suscripción
```

### 📊 Base de Datos
```
✅ schema.sql                         - Campo stripe_customer_id agregado
✅ seed-subscription-plans.sql        - Script para insertar planes
```

### 📖 Documentación (4 documentos)
```
✅ SUBSCRIPTION_SETUP.md              - Guía técnica detallada
✅ DEPLOYMENT_CHECKLIST.md            - Pasos para desplegar
✅ SUBSCRIPTION_FLOW.md               - Diagramas visuales
✅ README_BILLING.md                  - Este archivo
```

### 🔄 Webhooks Mejorados
```
✅ /api/stripe/webhook               - Maneja 5 eventos nuevos
```

### 🔤 Tipos Actualizados
```
✅ lib/types.ts                       - Tenant incluye stripe_customer_id
```

---

## Flujo Completo (Resumido)

```
1. Restaurante registra
   → Status = 'trial', 14 días gratis

2. Intenta acceder a admin después de 14 días
   → Layout valida
   → Redirige a /subscription-blocked

3. Elige plan y paga en Stripe Checkout
   → Webhook actualiza status a 'active'
   → Acceso desbloqueado

4. Cada mes, Stripe cobra automáticamente
   → Pago exitoso = continúa activo
   → Pago fallido = acceso bloqueado
```

---

## Próximos Pasos (Lo que FALTA)

### ❌ Configuración Stripe Requerida
1. Crear 3 productos en Stripe Dashboard (Basic, Pro, Premium)
2. Obtener `stripe_product_id` y `stripe_price_id` de cada uno
3. Crear Webhook en Stripe Dashboard
4. Actualizar `STRIPE_WEBHOOK_SECRET` en Vercel

### ❌ Migración de Base de Datos
1. Ejecutar `ALTER TABLE` para agregar `stripe_customer_id`
2. Ejecutar `seed-subscription-plans.sql` con IDs reales de Stripe

### ❌ Actualizar Variables de Entorno
```
STRIPE_SECRET_KEY=sk_test_...        (ya existe)
STRIPE_WEBHOOK_SECRET=whsec_...      (ACTUALIZAR)
NEXT_PUBLIC_APP_URL=...              (ya existe)
```

### ⚠️ Testing Recomendado
- [ ] Registrar restaurante de prueba
- [ ] Esperar 15+ días (o cambiar fecha en BD)
- [ ] Intentar acceder a admin → debe bloquear
- [ ] Seleccionar plan → debe ir a Stripe
- [ ] Simular pago → webhook debe actualizar
- [ ] Acceder nuevamente → debe funcionar

---

## Diferencia Clave: Dos Tipos de Dinero en Stripe

### Dinero de ÓRDENES (Como antes)
- Cliente paga comida → Va a `stripe_account_id` del restaurante
- Plataforma NO toma comisión (es configurable)
- Dinero directo al restaurante

### Dinero de SUSCRIPCIONES (NUEVO)
- Restaurante paga mensualmente → Va a `stripe_customer_id` tuyo
- Dinero para la plataforma (tu negocio B2B)
- Automático cada mes

**Ambos usan Stripe, pero cuentas diferentes.**

---

## Costos de Implementación

| Componente | Estado | Costo |
|-----------|--------|-------|
| Stripe (pagos) | Necesario | 2.9% + $0.30 por transacción |
| Supabase (BD) | Necesario | Ya incluido |
| Vercel (hosting) | Necesario | Ya incluido |
| **Total** | **Necesario** | **Stripe fee solamente** |

---

## Seguridad Implementada

✅ **RLS en Base de Datos**: Cada restaurante solo ve sus datos
✅ **Validación en Middleware**: No se puede saltear bloqueo
✅ **Webhook Signature Verification**: Confirma que Stripe envía
✅ **Aislamiento por Dominio**: Cada dominio valida su tenant
✅ **Customer ID en Stripe**: Seguimiento seguro

---

## Monitoreo Recomendado

### Diariamente
- Revisar Stripe Dashboard por nuevas suscripciones
- Verificar webhooks entregados exitosamente

### Semanalmente
- Contar tenants activos vs bloqueados
- Revisar ingresos en Stripe

### Mensualmente
- Tasa de conversión (trial → paid)
- Churn rate (cancelaciones)
- Plan más popular

---

## Solución de Problemas Rápida

| Problema | Causa | Solución |
|----------|-------|----------|
| Acceso no se bloquea | Layout no se ejecuta | Verificar que layout.tsx está en lugar correcto |
| Pago no actualiza status | Webhook no recibe | Verificar STRIPE_WEBHOOK_SECRET en Vercel |
| Stripe Checkout error | Precio inválido | Verificar stripe_price_id en DB |
| Trial funciona mal | Fecha del servidor | Verificar timestamp de created_at |

---

## Contacto para Soporte

- **Stripe Issues**: dashboard.stripe.com/support
- **Supabase Issues**: supabase.com/support
- **Vercel Issues**: vercel.com/support
- **Mi Email**: contacto@restaurantsaas.com

---

## Conclusión

✅ **COMPLETADO**: Sistema de facturación mensual con bloqueo automático
⏳ **PENDIENTE**: Configurar Stripe products y webhook
🚀 **LISTO PARA**: Testing en staging, luego producción

**Tiempo estimado para ir live**: 2-3 horas (configurar Stripe + migración DB + testing)

---

## Links Rápidos

- 📖 [Guía Técnica Detallada](./SUBSCRIPTION_SETUP.md)
- 🚀 [Checklist de Despliegue](./DEPLOYMENT_CHECKLIST.md)
- 📊 [Diagrama de Flujos](./SUBSCRIPTION_FLOW.md)
- 📋 [Plan Original](./CLAUDE.md)

---

**Última actualización**: 2 de abril de 2026

