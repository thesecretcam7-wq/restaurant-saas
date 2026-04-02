# ¿Cómo Acceder Ahora? (Después del Sistema de Dominios)

## ✅ Sistema Tipo Shopify Implementado

El middleware ahora detecta 3 formas de acceder:

1. **Por Slug** (recomendado)
2. **Por UUID del Tenant**
3. **Por Dominio Personalizado**

---

## 🚀 Acceso AHORA MISMO (Local + Vercel)

### Paso 1: Obtén el Slug

En Supabase SQL Editor, ejecuta:

```sql
SELECT id, organization_name, slug FROM tenants;
```

**Resultado esperado:**
```
id                                 | organization_name | slug
──────────────────────────────────┼──────────────────┼──────────────
550e8400-e29b-41d4-a716-446655... | Mi Pizzeria      | mi-pizzeria
```

### Paso 2: Accede Usando el Slug

#### En Desarrollo Local

```
http://localhost:3000/mi-pizzeria
```

#### En Vercel (Test)

```
https://restaurant-saas-inky.vercel.app/mi-pizzeria
```

✅ **Debería funcionar inmediatamente**

---

## 📋 Las 3 Formas de Acceso

### Forma 1: Por Slug (MEJOR)

```
Local:  http://localhost:3000/mi-pizzeria
Vercel: https://restaurant-saas-inky.vercel.app/mi-pizzeria
```

**Cómo funciona:**
- Middleware detecta `/mi-pizzeria` en la URL
- Busca `tenants.slug = 'mi-pizzeria'`
- Reescribe a `/{tenant_id}`

### Forma 2: Por UUID (FUNCIONA SIEMPRE)

```
Local:  http://localhost:3000/550e8400-e29b-41d4-a716-446655440000
Vercel: https://restaurant-saas-inky.vercel.app/550e8400-e29b-41d4-a716-446655440000
```

**Cómo funciona:**
- Middleware detecta UUID válido
- Lo deja como está (sin reescribir)
- Busca directamente por ID

### Forma 3: Por Dominio Personalizado (FUTURO)

Cuando el restaurante configura dominio personalizado:

```
https://mipizzeria.com
```

**Cómo funciona:**
- Middleware detecta que NO es el dominio base
- Busca `tenants.primary_domain = 'mipizzeria.com'`
- Reescribe a `/{tenant_id}`

---

## 🔧 Configuración Actual

En `.env.local`:

```env
NEXT_PUBLIC_BASE_DOMAIN=restaurant-saas-inky.vercel.app
```

Esto significa:
- **Dominio base:** `restaurant-saas-inky.vercel.app`
- **Slug funciona:** Sí ✅
- **Subdominio funciona:** No (requiere wildcard DNS)
- **Dominio personalizado funciona:** Sí ✅

---

## 📲 URLs de Ejemplo (Completas)

Suponiendo restaurante con `slug = "pizza-juan"`:

### Página de Inicio

```
http://localhost:3000/pizza-juan
https://restaurant-saas-inky.vercel.app/pizza-juan
```

### Menú

```
http://localhost:3000/pizza-juan/menu
https://restaurant-saas-inky.vercel.app/pizza-juan/menu
```

### Carrito

```
http://localhost:3000/pizza-juan/carrito
https://restaurant-saas-inky.vercel.app/pizza-juan/carrito
```

### Admin (Dashboard)

```
http://localhost:3000/pizza-juan/admin/dashboard
https://restaurant-saas-inky.vercel.app/pizza-juan/admin/dashboard
```

### Admin (Seleccionar Plan)

```
http://localhost:3000/pizza-juan/admin/configuracion/planes
https://restaurant-saas-inky.vercel.app/pizza-juan/admin/configuracion/planes
```

---

## ✅ Test Rápido (Verifica Que Funciona)

### 1. Verifica Restaurante Existe

```sql
SELECT COUNT(*) FROM tenants;
```

Si es 0: crea uno en `/register`

### 2. Obtén el Slug

```sql
SELECT slug FROM tenants LIMIT 1;
```

Resultado: `tu-slug-aqui`

### 3. Accede en Vercel

Abre en el navegador:

```
https://restaurant-saas-inky.vercel.app/tu-slug-aqui
```

✅ Debería cargar la página del restaurante

### 4. Click en Admin

```
Click "Admin" en esquina superior derecha
```

Debería ir a:
```
/tu-slug-aqui/admin/login
```

### 5. Login

- Email: el que usaste para registrar
- Password: tu contraseña

---

## 🆘 Si No Funciona

### Error: "Restaurant Not Found"

**Causas:**

1. Slug no existe
   ```sql
   SELECT slug FROM tenants;
   ```
   Si está vacío, crea uno

2. Middleware no actualizado
   - Reinicia: `npm run dev`

3. Slug incorrecto en la URL
   - Verifica que coincida exactamente

### Error: Página no carga

1. Verifica que estés en desarrollo:
   ```bash
   npm run dev
   ```

2. Verifica logs en consola

3. Reinicia el servidor

### Si aún no funciona

Usa el UUID en lugar del slug (siempre funciona):

```
http://localhost:3000/550e8400-e29b-41d4-a716-446655440000
```

---

## 🎯 Resumen Rápido

| Lo que quieres | URL |
|---|---|
| Ver restaurante | `/slug` |
| Ver menú | `/slug/menu` |
| Ver admin | `/slug/admin/login` |
| Ver planes | `/slug/admin/configuracion/planes` |

Donde `slug` es el slug del restaurante.

---

## 🔄 Próximas Caracteristicas

Cuando agregues soporte para subdominios:

```
https://pizza-juan.restaurant-saas.com
```

También funcionará automáticamente.

---

## 📚 Más Información

- `DOMAIN_SETUP.md` - Configuración completa de dominios
- `QUICK_START_DOMAIN.md` - Quick start de acceso
- `QUICK_REFERENCE.md` - Tarjeta de referencia

---

**¡Ya está listo! Usa `/slug` para acceder.** 🚀

