# Quick Start: Cómo Acceder Ahora

## OPCIÓN 1: Por Slug (Recomendado)

Si tu restaurante tiene `slug = "mirestaurante"`:

```
http://localhost:3000/mirestaurante
```

---

## OPCIÓN 2: Por ID del Tenant

Si tienes el UUID del tenant:

```
http://localhost:3000/550e8400-e29b-41d4-a716-446655440000
```

**Para obtener el ID:**

```sql
SELECT id, organization_name, slug FROM tenants LIMIT 5;
```

---

## OPCIÓN 3: En Producción (Subdominio)

Una vez despliegues y configures DNS:

```
https://mirestaurante.miplatforma.com
```

---

## Pasos Rápidos (Ahora Mismo)

### 1. Obtén el Slug del Restaurante

En Supabase SQL Editor:

```sql
SELECT slug FROM tenants LIMIT 1;
```

**Resultado:**
```
slug
─────────────
mipizzeria
```

### 2. Accede

```
http://localhost:3000/mipizzeria
```

✅ **Debería funcionar ahora**

---

## Si Aún No Funciona

### Verificar en BD

```sql
SELECT id, organization_name, slug FROM tenants;
```

Si está vacío:
- No hay restaurantes creados
- Ve a `/register` para crear uno

### Verificar Middleware

El middleware se activó cuando copiaste `middleware.ts`. Asegúrate:

1. `middleware.ts` está en la raíz del proyecto
2. No hay errores en el build
3. Reinicia `npm run dev`

### Verificar Slug

Si el slug está raro (con caracteres especiales):

```
El slug debe ser: a-z, 0-9, guión
Ejemplo válido: mi-pizzeria, pizza123
Ejemplo inválido: mí-pizzeria, pizza_123
```

Si está mal, actualiza en BD:

```sql
UPDATE tenants
SET slug = 'mi-pizzeria'
WHERE id = 'tu-tenant-id';
```

---

## URLs Que Funcionan (Todo)

Suponiendo `slug = "mipizzeria"` y `id = "123abc"`:

```
✅ http://localhost:3000/mipizzeria        ← Por slug
✅ http://localhost:3000/123abc            ← Por ID
✅ http://localhost:3000/mipizzeria/menu   ← Rutas internas
✅ http://localhost:3000/123abc/menu       ← Rutas internas
```

---

## URLs Que NO Funcionan

```
❌ http://localhost:3000/                 ← Raíz (sin slug/id)
❌ http://localhost:3000/admin            ← Admin sin dominio
❌ http://localhost:3000/algunacosa       ← Slug que no existe
```

---

## Para Admin

Una vez accedas a la página del restaurante:

```
http://localhost:3000/mipizzeria
↓
Click "Admin" (en esquina superior derecha)
↓
http://localhost:3000/mipizzeria/(admin)/login
↓
Login con email/password
```

---

## Test Rápido (3 pasos)

### 1. Crea Restaurante

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "restaurantName": "Mi Pizzeria",
    "ownerName": "Juan"
  }'
```

Copia el `slug` de la respuesta.

### 2. Accede

```
http://localhost:3000/{slug}
```

### 3. Click Admin

Debería redirigir a login.

---

## Ambiente de Producción

### En Vercel

Necesita `NEXT_PUBLIC_BASE_DOMAIN`:

```env
NEXT_PUBLIC_BASE_DOMAIN=miplatforma.com
# O si usas vercel:
NEXT_PUBLIC_BASE_DOMAIN=miplatforma.vercel.app
```

Luego:
```
https://mipizzeria.miplatforma.com
```

---

## Ayuda Rápida

| Problema | Solución |
|----------|----------|
| "Restaurant Not Found" | Verifica que el slug existe: `SELECT slug FROM tenants;` |
| Middleware no funciona | Reinicia dev server: `npm run dev` |
| Slug incorrecto | Actualiza en BD: `UPDATE tenants SET slug = '...'` |
| No hay restaurantes | Crear uno: `/register` |

---

**¡Listo! Ya puedes acceder.**

