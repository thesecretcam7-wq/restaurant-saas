# Configuración de Dominios: Sistema Tipo Shopify

## Resumen

El sistema ahora funciona como **Shopify**:
- Todos los restaurantes acceden desde el mismo dominio base
- Cada restaurante tiene un **slug único** (ej: `mirestaurante`)
- Cuando compran un dominio personalizado, pueden cambiar a él
- El mismo sistema soporta las 3 formas de acceso

---

## Las 3 Formas de Acceso

### 1️⃣ Por Slug (Subdominio Recomendado)
```
https://mirestaurante.miplatforma.com
                  ↑↑↑↑↑↑↑↑↑
                  El slug del restaurante
```

**Cómo funciona:**
- El middleware detecta el subdominio
- Busca el tenant con `slug = mirestaurante`
- Reescribe internamente a `/{tenant-id}`

**Ventaja:** Es la forma "Shopify"

---

### 2️⃣ Por Slug en Path
```
https://miplatforma.com/mirestaurante
                    ↑↑↑↑↑↑↑↑↑
                    El slug del restaurante
```

**Cómo funciona:**
- El middleware detecta el slug en la URL
- Busca el tenant con `slug = mirestaurante`
- Reescribe internamente a `/{tenant-id}`

**Ventaja:** No requiere wildcard DNS

---

### 3️⃣ Por Dominio Personalizado
```
https://mirestaurante.com
↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
Dominio personalizado del restaurante
```

**Cómo funciona:**
- El middleware detecta que NO es el dominio base
- Busca por `primary_domain = mirestaurante.com`
- Reescribe internamente a `/{tenant-id}`

**Ventaja:** Dominio completamente personalizado

---

## Flujo Tipo Shopify

```
RESTAURANTE REGISTRA
├─ slug = "mirestaurante" (automático)
├─ primary_domain = null (sin dominio personalizado)
└─ Acceso: https://mirestaurante.miplatforma.com ✅

COMPRA DOMINIO
├─ Ingresa dominio en panel: mirestaurante.com
├─ Configura CNAME en su registrador
│  └─ mirestaurante.com CNAME → miplatforma.com
├─ Después de propagación DNS (~24h)
└─ Acceso: https://mirestaurante.com ✅
   (También sigue funcionando por subdominio)

CAMBIA DE DOMINIO
├─ Compra dominio.com
├─ Actualiza primary_domain en BD
├─ Configura CNAME
└─ Acceso: https://dominio.com ✅
   (El antiguo dominio podría redirigir)
```

---

## Configuración del Dominio Base

### En .env.local

```env
# Dominio base de tu plataforma
NEXT_PUBLIC_BASE_DOMAIN=restaurant-saas-inky.vercel.app

# O si usas dominio propio:
NEXT_PUBLIC_BASE_DOMAIN=miplatforma.com
```

### En Vercel (para Subdominio)

Si quieres soportar subdominos como `mirestaurante.miplatforma.com`:

1. Vercel → Project Settings → Domains
2. Agregar dominio base: `miplatforma.com`
3. Agregar wildcard: `*.miplatforma.com`
4. Vercel configura automáticamente el DNS

---

## Para Restaurante: Agregar Dominio Personalizado

### Paso 1: Panel Admin

En `/[dominio]/admin/configuracion/dominio`:
```
1. Ingresa tu dominio: mirestaurante.com
2. Click "Verificar Dominio"
3. Sistema te dice qué CNAME configurar
```

### Paso 2: Registrador de Dominios

En tu registrador (GoDaddy, Namecheap, etc.):

```
Tipo: CNAME
Nombre: mirestaurante.com (o @)
Valor: tu-plataforma.com
```

### Paso 3: Esperar Propagación

- DNS tarda 2-48 horas en propagarse
- Sistema chequea cada hora si está listo
- Cuando se propague: acceso automáticamente funciona

---

## En la Base de Datos

### Campos de Tenant

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,        -- ej: "mirestaurante"
  primary_domain TEXT UNIQUE,       -- ej: "mirestaurante.com" (opcional)
  ...
)
```

### Ejemplos

| Slug | primary_domain | Acceso |
|------|---|---|
| `pizza-juan` | null | `pizza-juan.miplatforma.com`<br/>`miplatforma.com/pizza-juan` |
| `pizza-juan` | `pizzajuan.com` | `pizzajuan.com` (+ las anteriores) |

---

## Cómo Funciona el Middleware

```typescript
// middleware.ts

const hostname = request.headers.get('host')
// Ejemplos: "mirestaurante.miplatforma.com", "miplatforma.com", "mirestaurante.com"

// PASO 1: ¿Es un dominio personalizado?
if (!hostname.includes(BASE_DOMAIN)) {
  // Buscar por primary_domain
  const tenant = await getTenantByDomain(hostname)
  if (tenant) {
    // Reescribir a /{tenant-id}
    return NextResponse.rewrite(new URL(`/${tenant.id}...`))
  }
}

// PASO 2: ¿Es un subdominio?
const subdomain = extractSubdomain(hostname)
if (subdomain) {
  // Buscar por slug
  const tenant = await getTenantBySlug(subdomain)
  if (tenant) {
    // Reescribir a /{tenant-id}
    return NextResponse.rewrite(new URL(`/${tenant.id}...`))
  }
}

// PASO 3: ¿Es un slug en path?
const slug = extractSlugFromPath(pathname)
if (slug) {
  // Buscar por slug
  const tenant = await getTenantBySlug(slug)
  if (tenant) {
    // Reescribir a /{tenant-id}
    return NextResponse.rewrite(new URL(`/${tenant.id}...`))
  }
}

// Ninguno encontrado → error
```

---

## Ejemplos Reales

### Scenario 1: Pizzería Local (Sin Dominio)

```
Nombre: Pizza Juan
Slug: pizza-juan
primary_domain: null

URLs que funcionan:
✅ https://pizza-juan.miplatforma.com
✅ https://miplatforma.com/pizza-juan
❌ https://pizzajuan.com (no configurado)
```

### Scenario 2: Pizzería con Dominio

```
Nombre: Pizza Juan
Slug: pizza-juan
primary_domain: pizzajuan.com

URLs que funcionan:
✅ https://pizzajuan.com                    ← Principal
✅ https://pizza-juan.miplatforma.com       ← Alternativa
✅ https://miplatforma.com/pizza-juan       ← Alternativa
```

### Scenario 3: Cadena de Restaurantes

```
Restaurante 1:
- Slug: burger-king-caracas
- primary_domain: bk-caracas.com
✅ https://bk-caracas.com

Restaurante 2:
- Slug: burger-king-maracaibo
- primary_domain: bk-maracaibo.com
✅ https://bk-maracaibo.com

Todos usan la misma plataforma
```

---

## Ventajas del Sistema

✅ **Sin Costo Inicial**: Funciona sin dominio personalizado
✅ **Crecimiento**: Compran dominio cuando les conviene
✅ **Flexibilidad**: 3 formas de acceder
✅ **Tipo Shopify**: Como lo conocen
✅ **Sin Migraciones**: Agregar dominio es simple
✅ **Monolítico**: Una plataforma, muchos restaurantes

---

## DNS para Restaurantes

### Si usan GoDaddy

```
1. Ir a Domains → Mi dominio
2. Click "Manage DNS"
3. Agregar registro:
   Type: CNAME
   Name: @ (o el nombre del dominio)
   Value: tu-plataforma.com
4. Guardar (tarda ~24h)
```

### Si usan Namecheap

```
1. Ir a Dashboard → Manage
2. Click "Advanced DNS"
3. Add New Record:
   Type: CNAME
   Host: @ (o www)
   Value: tu-plataforma.com
4. Guardar
```

### Si usan CloudFlare

```
1. Ir a DNS
2. Add Record:
   Type: CNAME
   Name: @ (o www)
   Content: tu-plataforma.com
   TTL: Auto
3. Guardar
```

---

## Validación de Dominio

En el panel admin, cuando agregan dominio:

```
1. Ingresa: mirestaurante.com
2. Sistema valida que el CNAME existe
3. Si ✅: Activa acceso
4. Si ❌: Muestra instrucciones
```

---

## Monitoreo

Para saber qué dominios están activos:

```sql
SELECT
  organization_name,
  slug,
  primary_domain,
  CASE
    WHEN primary_domain IS NULL THEN 'Dominio base'
    ELSE 'Dominio personalizado'
  END as tipo
FROM tenants
WHERE status = 'active'
ORDER BY created_at DESC;
```

---

## Próximas Características (Opcional)

- [ ] Email de bienvenida con instrucciones de CNAME
- [ ] Check automático cada hora si DNS está propagado
- [ ] Dashboard de dominio en panel admin
- [ ] Redireccionamiento del dominio antiguo al nuevo
- [ ] Certificados SSL automáticos (Let's Encrypt)
- [ ] Subdominio www automático

---

## Testing Localmente

### Si tienes dominio local

```
# En tu /etc/hosts (macOS/Linux) o C:\Windows\System32\drivers\etc\hosts

127.0.0.1 mirestaurante.localhost
127.0.0.1 miplatforma.localhost
```

Luego accede a:
- `http://mirestaurante.localhost:3000`
- `http://miplatforma.localhost:3000/mirestaurante`

### Si usas ngrok

```bash
ngrok http 3000
# Te da: https://xxxxxx.ngrok.io

# Usar como BASE_DOMAIN
NEXT_PUBLIC_BASE_DOMAIN=xxxxxx.ngrok.io
```

---

## Conclusión

El sistema ahora funciona **exactamente como Shopify**:
- Dominio base compartido para todos
- Slug único para cada restaurante
- Opción de dominio personalizado
- Sin migraciones complicadas

**Para habilitar subdominio:**
- Configura wildcard DNS en tu proveedor
- Actualiza `NEXT_PUBLIC_BASE_DOMAIN`
- Listo

