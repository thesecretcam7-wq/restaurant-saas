# Estrategia de Colores EccoFood

## Resumen
- **Admin Pages**: SIEMPRE usan colores globales de EccoFood (rojo-naranja-amarillo)
- **Store Pages**: Usan colores personalizados del cliente (del branding)
- **Fallback**: Si el cliente no personaliza, usa rojo EccoFood (#E4002B)

## Paleta Global (Admin)
```css
--primary: #E4002B      /* KFC Red - Ultra intenso */
--secondary: #FF5500    /* Naranja intenso */
--accent: #FFD700       /* Amarillo brillante */
```

## Archivos Admin
- `/app/[domain]/admin/layout.tsx` → Usa colores globales
- `/app/[domain]/admin/**/*` → Todos los subpages admin

## Archivos Store
- `/app/[domain]/(store)/layout.tsx` → Pasa primaryColor del cliente
- `/app/[domain]/(store)/**/*` → Todos usan branding?.primary_color

Fallback en store pages: `branding?.primary_color || '#E4002B'`

## Cómo Funciona
1. **Admin accede a restaurante**: Ve los colores rojo-naranja-amarillo de EccoFood
2. **Cliente personaliza branding**: Cambia su primary_color
3. **Cliente accede a tienda**: Ve sus colores personalizados
4. **Cliente no personaliza**: Ve el rojo EccoFood por defecto

## Ventajas
✅ Admin siempre profesional y consistente
✅ Cliente ve su marca personalizada
✅ Transición suave (fallback a EccoFood rojo)
✅ No hay conflicto entre admin y store
