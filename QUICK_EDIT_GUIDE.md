# Restaurant.SV - Guía Rápida de Edición

## 🎯 Archivos Más Importantes (Para Editar)

### 🎨 Branding & Diseño
```
app/layout.tsx                    ← Metadata + theme color global
app/manifest.ts                   ← PWA manifest + colors
app/page.tsx                      ← Landing page
app/[domain]/layout.tsx           ← Layout de tenant
app/[domain]/page.tsx             ← Home page de restaurante
```

### 🔐 Autenticación & Registro
```
app/api/auth/register/route.ts    ← Endpoint de registro (CRÍTICO)
app/api/auth/login/route.ts       ← Endpoint de login
app/register/page.tsx             ← Página de registro
app/login/page.tsx                ← Página de login
```

### 🔧 Configuración & Middleware
```
middleware.ts                      ← Domain detection + tenant lookup
.env.local                         ← Variables de entorno
CLAUDE.md                          ← Documentación del proyecto
BUGS_FIXED.md                      ← Este archivo (bugs corregidos)
```

### 🛠️ Utilidades
```
lib/tenant.ts                      ← Funciones de tenant
lib/supabase/server.ts            ← Cliente de Supabase
lib/types.ts                       ← TypeScript interfaces
```

---

## 🚀 Flujos de Edición Comunes

### 1. Cambiar Colores (Naranja)
**Archivo**: `app/api/auth/register/route.ts` (línea 84-86)
```typescript
primary_color: '#0A0A0A',      // Dark background
accent_color: '#F97316',       // Orange accent
```

**Archivo**: `app/layout.ts` (línea 29)
```typescript
themeColor: "#F97316"
```

### 2. Cambiar Nombre de App
**Archivos**:
- `app/layout.tsx` - Línea 12-14
- `app/manifest.ts` - Línea 5-6
- `app/[domain]/page.tsx` - Línea 216
- `app/[domain]/admin/configuracion/pagina/page.tsx` - Línea 646

**Buscar**: "Restaurant SaaS"  
**Reemplazar**: "Restaurant.SV"

### 3. Debuggear Problema de Registro
**Archivo**: `app/api/auth/register/route.ts`

Los cambios que hice:
- Líneas 49-55: Validación de slug
- Líneas 80-100: Error handling de tenant_branding
- Líneas 103-119: Error handling de restaurant_settings

### 4. Debuggear Middleware
**Archivo**: `middleware.ts`

Logs agregados:
- Línea 17: Log de request
- Línea 19-23: Log de Case 1 (custom domain)
- Línea 35-45: Log de Case 2 (slug path)
- Línea 53-62: Log de Case 3 (subdomain)

**Para revisar en Vercel**: 
```
https://vercel.com/thesecretcam7-wq/restaurant-saas/analytics
→ Logs tab
→ Buscar "[Middleware]"
```

---

## 📂 Estructura de Carpetas

```
restaurant-saas/
├── app/
│   ├── (raíz)
│   │   ├── layout.tsx            ← EDITAR: metadata, colors
│   │   ├── manifest.ts           ← EDITAR: PWA manifest
│   │   ├── page.tsx              ← EDITAR: landing page
│   │   ├── login/                ← Login page
│   │   ├── register/             ← Register page
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── register/     ← CRÍTICO: crear tenant
│   │       │   └── login/
│   │       └── ...
│   │
│   └── [domain]/                 ← Rutas de tenant
│       ├── layout.tsx            ← EDITAR: tenant layout
│       ├── page.tsx              ← EDITAR: home page
│       ├── (store)/              ← Páginas públicas
│       └── (admin)/              ← Páginas de admin
│
├── lib/
│   ├── tenant.ts                 ← Lógica de tenant
│   └── supabase/
│
├── middleware.ts                 ← EDITAR: domain routing
├── BUGS_FIXED.md                 ← Documentation
└── QUICK_EDIT_GUIDE.md          ← Este archivo
```

---

## 🐛 Bugs Actuales & Soluciones

### Bug #1-6: ✅ CORREGIDOS
Ver `BUGS_FIXED.md` para detalles

### Bug #7: ⚠️ EN INVESTIGACIÓN
**Problema**: Middleware no encuentra tenant por slug  
**Síntoma**: "Restaurante No Encontrado" en dashboard  
**Logs**: Ver archivo `middleware.ts` (con logging nuevo)

**Próximos pasos**:
1. Esperar a que Vercel despliegue
2. Revisar logs: https://vercel.com/thesecretcam7-wq/restaurant-saas/analytics
3. Buscar "[Middleware]" en los logs
4. Ver exactamente qué error retorna Supabase

---

## 🔗 URLs Importantes

**Local**: `C:\Users\these\OneDrive\Documentos\claude\restaurant-saas`  
**Vercel**: https://restaurant-saas-inky.vercel.app/  
**GitHub**: https://github.com/thesecretcam7-wq/restaurant-saas  

---

## 📝 Comandos Útiles

```bash
# Actualizar código local
git pull origin master

# Ver cambios sin commit
git status
git diff

# Ver últimos commits
git log --oneline -10

# Hacer commit de cambios
git add archivo.tsx
git commit -m "Descripción del cambio"
git push origin master

# Ver qué cambié en un archivo
git diff app/layout.tsx
```

---

## ✅ Checklist para Testing

- [ ] Landing page carga correctamente
- [ ] Login page muestra dark theme
- [ ] Register form valida slug vacío
- [ ] Registro crea usuario en Supabase
- [ ] Dashboard de usuario muestra correctamente
- [ ] Colores son naranja (#F97316)
- [ ] Branding dice "Restaurant.SV" en todo
- [ ] Mesero/Cocina sistema funciona
- [ ] Multi-moneda detecta país correcto

---

Última actualización: 9 de Abril de 2026
