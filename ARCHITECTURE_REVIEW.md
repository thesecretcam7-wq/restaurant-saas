# Restaurant.SV - Revisión Completa de Arquitectura

## 📋 Resumen Ejecutivo

**Concepto**: App tipo Shopify pero para restaurantes
- ✅ Cada restaurante se registra y crea su propia "tienda"
- ✅ Personalización completa (branding, menú, configuración)
- ✅ URL única durante período de prueba (ej: mirestaurante.restaurant-saas-inky.vercel.app)
- ⚠️ Soporte para dominio personalizado (en desarrollo)

---

## 🏗️ ARQUITECTURA MULTI-TENANT

### Base de Datos (Supabase PostgreSQL)

#### **Tabla Principal: `tenants`**
```
Campos clave:
- id (UUID) → Identificador único del restaurante
- slug (UNIQUE) → "cloud-restaurant" → URL: /cloud-restaurant/...
- primary_domain (UNIQUE) → "mirestaurante.com" (cuando compren dominio)
- owner_id (FK auth.users) → Usuario propietario
- owner_email, owner_name → Contacto
- status → trial|active|suspended|cancelled
- subscription_plan → free|basic|pro|premium
- stripe_* fields → Pagos y Stripe Connect
- created_at, updated_at
```

**Ventaja**: Datos completamente separados por `tenant_id` en todas las tablas

---

### Modelo Multi-Tenant

| Tabla | Tenancy Model | RLS Protection |
|-------|---------------|----------------|
| tenants | Direct (owner_id) | ✅ Owner only |
| tenant_branding | By tenant_id | ✅ Owner only |
| restaurant_settings | By tenant_id | ✅ Owner only |
| menu_categories | By tenant_id | ✅ Public read, owner write |
| menu_items | By tenant_id | ✅ Public read, owner write |
| orders | By tenant_id | ✅ Owner reads all |
| reservations | By tenant_id | ✅ Owner only |
| customers | By tenant_id | ✅ Owner only |

---

## 🌐 DETECCIÓN DE DOMINIO Y ROUTING

### Flujo Actual (middleware.ts)

```
Request → Middleware → 3 CASOS

CASO 1: Dominio Personalizado
  Si hostname = "mirestaurante.com"
  → Buscar tenant por primary_domain
  → Reescribir a //{tenant_id}/...

CASO 2: Slug en Path
  Si URL = /cloud-restaurant/admin/dashboard
  → Extraer slug "cloud-restaurant"
  → Buscar tenant por slug
  → Reescribir a //{tenant_id}/admin/dashboard

CASO 3: Subdominio
  Si hostname = "cloud-restaurant.restaurant-saas-inky.vercel.app"
  → Extraer subdominio "cloud-restaurant"
  → Buscar tenant por slug
  → Reescribir a //{tenant_id}/...

DEFAULT: Pasar a través (rutas públicas como /login, /register)
```

### Problema Identificado ⚠️

**Bug #7: Middleware No Encuentra Tenant por Slug**

El middleware intenta buscar el tenant en Supabase:
```typescript
const { data, error } = await supabase
  .from('tenants')
  .select('id, slug')
  .eq('slug', slug)
  .single()
```

**Causas Posibles:**
1. ❌ Slug no se guarda correctamente en BD (REFUTADO - registro exitoso)
2. ❌ Problema de RLS (REFUTADO - usa SERVICE_ROLE_KEY)
3. ❌ Cliente Supabase incorrecto (PARCIALMENTE CORREGIDO - cambio de createServerClient a createClient)
4. ⚠️ **ACTUAL**: Aún indeterminado - en investigación con logging detallado

---

## 🔐 AUTENTICACIÓN Y SEGURIDAD

### Flujo de Registro

```
1. Usuario llena formulario
   - Nombre restaurante: "Cloud Restaurant"
   - Email: "admin@example.com"
   - Contraseña: "SecurePass123"
   - Nombre propietario: "John Doe"

2. POST /api/auth/register
   ✅ Validar campos
   ✅ Crear usuario Supabase Auth
   ✅ Generar slug: "cloud-restaurant"
   ✅ Validar slug no vacío
   ✅ Crear tenant
   ✅ Crear tenant_branding (colores default)
   ✅ Crear restaurant_settings (timezone, país)
   ❌ Redirigir a /{slug}/admin/dashboard

3. Middleware intenta encontrar tenant
   ❌ FALLA: No encuentra por slug
   → Página muestra "Restaurante No Encontrado"
```

### Flujo de Login

```
1. Usuario entra a /login?redirect=/cloud-restaurant/admin/dashboard
2. Ingresa email + password
3. Supabase valida credenciales
4. JWT se guarda en localStorage
5. Middleware verifica RLS para este tenant_id
6. Acceso permitido si owner_id = auth.uid()
```

**RLS Policies en Acción:**
- Usuarios solo ven su propio tenant
- Clientes ven menú público
- Admin ve órdenes, clientes, configuración

---

## 🎨 SISTEMA DE PERSONALIZACIÓN

### tenant_branding - Completo ✅

Cada restaurante puede personalizar:
- **Colores**: primary, secondary, accent, background
- **Tipografía**: font_family, font_url (Google Fonts)
- **Branding**: app_name, tagline, favicon_url, logo_url
- **Textos**: custom_texts (JSON) para mensajes personalizados

### restaurant_settings - Funcional ✅

```
Información General:
- display_name, description, address, phone
- country (default: CO), timezone (default: America/Bogota)

Delivery:
- delivery_enabled (boolean)
- delivery_fee, min_order, delivery_time_minutes

Reservaciones:
- reservations_enabled
- total_tables, seats_per_table
- reservation_advance_hours

Pagos:
- cash_payment_enabled
- tax_rate
- operating_hours (JSON)
```

---

## 💰 SISTEMA DE PAGOS Y SUSCRIPCIÓN

### Modelo B2B (SaaS):

```
Usuario Registrado
    ↓
trial (14 días gratis)
    ↓
Elige plan:
    - FREE: Menu básico
    - BASIC: $30/mes + delivery
    - PRO: $60/mes + reservas + Stripe Connect
    - PREMIUM: $120/mes + todo + soporte

Pagos:
    - Suscripción → Stripe (a Restaurant.SV)
    - Órdenes de clientes → Stripe Connect (a restaurante)
```

### Implementación Actual:

✅ Tabla `subscription_plans` con precios
✅ Campo `subscription_plan` en tenants
✅ Validación en layout admin (checkSubscription)
✅ Página subscription-blocked

❓ **¿Falta aclarar?**
- ¿Cómo se cobra? (webhook de Stripe)
- ¿Downgrade automático? (después de prueba)
- ¿Stripe Connect para cada restaurante? (campo stripe_account_id existe)

---

## 🛒 FLUJO DE COMPRA DE CLIENTE (USUARIO FINAL)

```
Cliente anónimo visita: mirestaurante.restaurant-saas-inky.vercel.app

Middleware:
    CASO 2: slug="mirestaurante" → Busca tenant
    ✅ Encuentra → Reescribe a /{tenant_id}/...

Routing:
    /mirestaurante → Reescrito a /{tenant_id}/(store)/page
    /mirestaurante/menu → /{tenant_id}/(store)/menu/page
    /mirestaurante/carrito → /{tenant_id}/(store)/carrito/page

Cliente:
    1. Ve menú con branding del restaurante
    2. Agrega items al carrito
    3. Ingresa email (NO requiere login)
    4. Selecciona delivery o pickup
    5. Paga con Stripe
    6. Orden se crea en BD (customer_id = NULL si anónimo)

Admin del restaurante:
    Ve orden en /{domain}/admin/pedidos
    - Cliente: John Doe
    - Email: john@example.com
    - Teléfono: (si proporciona)
    - Items pedidos
    - Estado: pending → confirmed → preparing → delivered
```

---

## 🔗 DOMINIOS PERSONALIZADOS (TODO)

### Flujo planeado:

```
Restaurante compra mirestaurante.com

Admin agrega en /configuracion/branding:
    primary_domain = "mirestaurante.com"

DNS (cliente):
    CNAME mirestaurante.com → restaurant-saas-inky.vercel.app
    (o A record si Vercel lo permite)

Middleware CASO 1:
    Request a mirestaurante.com
    → Busca tenant por primary_domain
    → ✅ Encuentra
    → Reescribe a /{tenant_id}/...

Resultado:
    Cliente ve: mirestaurante.com/menu (aunque internamente es /{id}/menu)
```

**Estado**: ⚠️ Código existe, no está testeado

---

## 📊 FUNCIONALIDADES POR ESTADO

### ✅ IMPLEMENTADAS Y FUNCIONALES

1. **Autenticación**
   - Registro con email/password
   - Login/logout
   - RLS en Supabase

2. **Branding**
   - Colores personalizables
   - Textos custom
   - Favicon, logo

3. **Menú**
   - Categorías y items
   - Imágenes
   - Variantes (JSON)
   - Estado disponibilidad

4. **Órdenes**
   - Crear orden (anónimo)
   - Ver órdenes (admin)
   - Estados: pending → confirmed → preparing → delivered

5. **Admin Panel**
   - Dashboard
   - Productos
   - Órdenes
   - Clientes
   - Configuración

### ⚠️ PARCIALMENTE IMPLEMENTADAS

1. **Reservaciones**
   - Tabla existe
   - UI existe (configuracion/reservas)
   - ❓ ¿Validación de horarios?
   - ❓ ¿Confirmación automática?

2. **Delivery**
   - Configuración existe
   - ❓ ¿Integración con proveedores?
   - ❓ ¿Cálculo de distancia?

3. **Stripe Connect**
   - Campos en BD existen
   - ❓ ¿OAuth implementado?
   - ❓ ¿Webhook de pagos?

4. **Mesero/Cocina System**
   - Mencionado en QUICK_EDIT_GUIDE
   - ❓ ¿Realtime con Supabase?
   - ❓ ¿PIN auth?

### ❌ NO IMPLEMENTADAS

1. **Multi-currency** (mencionado en memoria)
   - ❓ ¿Conversión automática?
   - ❓ ¿Por country?

2. **Analytics/Reportes**
   - Dashboard vacío (stats = {})
   - No hay gráficos

3. **Email notifications**
   - No hay integración SendGrid/Resend

4. **SMS for delivery**
   - No hay integración Twilio

---

## 🚨 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. **Bug #7: Middleware No Encuentra Tenant (ACTIVO)**
- **Severidad**: CRÍTICA
- **Impacto**: Usuarios no pueden acceder al dashboard después de registrarse
- **Status**: En investigación
- **Logs**: Detallados en `/logs/bug-7-investigation`

### 2. **Dashboard No Carga Datos Reales**
- Dashboard muestra stats vacíos: `{totalOrders: undefined, totalRevenue: undefined}`
- Los gráficos son placeholders
- No hay API endpoint para `/api/dashboard-stats`

### 3. **Sin Protección de Acceso Cliente ↔️ Admin**
- El layout admin no valida si usuario es propietario
- Solo chequea suscripción, no ownership
- **Riesgo**: User A podría acceder a `/{slug}/admin/` de otro restaurante si sabe el slug

### 4. **Sistema de Planes Incompleto**
- Campo `subscription_plan` en tenants
- Tabla `subscription_plans` con precios
- ❌ **Falta**: Webhook de Stripe para cambiar estado
- ❌ **Falta**: Downgrade automático después de trial
- ❌ **Falta**: Feature gates por plan (qué se habilita/deshabilita)

### 5. **Stripe Connect No Implementado**
- Campos existen en BD: `stripe_account_id`, `stripe_account_status`
- ❌ **Falta**: OAuth endpoint para conectar cuenta Stripe
- ❌ **Falta**: Webhook para validar pagos de clientes
- ❌ **Falta**: Transfers a cuenta del restaurante

---

## ✨ FORTALEZAS ARQUITECTÓNICAS

1. **RLS Bien Pensada**
   - Cada restaurante ve solo sus datos
   - Clientes ven menú público
   - Admin ve todo su tenant

2. **Slug como ID Amigable**
   - `cloud-restaurant` es legible
   - Fácil de recordar
   - Bueno para SEO

3. **Separación de Rutas**
   - `/(store)` para clientes
   - `/(admin)` para propietarios
   - Claro y mantenible

4. **Branding Centralizado**
   - Un layout dinámico por tenant
   - Colores y textos en BD
   - Fácil de customizar

---

## 🔧 RECOMENDACIONES

### Prioridad 1 (CRÍTICO)
1. **Resolver Bug #7**: Middleware no encuentra tenant
   - Implementar logging detallado
   - Verificar que slug se guarda correctamente
   - Validar conexión Supabase en middleware

2. **Proteger rutas admin**
   ```typescript
   // Agregar a layout admin:
   const { data: { user } } = await supabase.auth.getUser()
   const tenant = await getTenantFromSlug(slug)
   if (tenant.owner_id !== user.id) redirect('/unauthorized')
   ```

3. **Implementar feature gates por plan**
   ```typescript
   const canUseFeature = (plan, feature) => {
     const features = {
       free: ['menu', 'orders'],
       basic: ['menu', 'orders', 'delivery'],
       pro: ['menu', 'orders', 'delivery', 'reservations'],
       premium: ['*']
     }
     return features[plan].includes(feature)
   }
   ```

### Prioridad 2 (IMPORTANTE)
1. Implementar `/api/dashboard-stats`
   - Órdenes totales
   - Ingresos
   - Reservas
   - Clientes

2. Webhook de Stripe para cambiar `subscription_plan`
3. Stripe Connect OAuth flow
4. Email notifications (registro, orden confirmada)

### Prioridad 3 (NICE-TO-HAVE)
1. Multi-currency by country
2. Analytics dashboard
3. Delivery tracking integrations
4. SMS notifications

---

## 📝 CONCLUSIÓN

**La arquitectura está bien pensada** para un SaaS tipo Shopify:

✅ Multi-tenant correctamente diseñado
✅ RLS bien implementada
✅ Escalable a muchos restaurantes
✅ Personalización completa
✅ Sistema de pagos en lugar
⚠️ Algunos bugs y features incompletas

**Status**: Listo para producción con fixes de bugs críticos

---

Última actualización: 9 de Abril de 2026
