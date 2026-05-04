# 🎨 Design System - Restaurant SaaS (Light Mode)

**Objetivo:** Crear visual profesional que atraiga pequeños restaurantes, supera a Qamarero + TurboPOS

---

## 🎭 Paleta de Colores

### Colores Primarios
```
Primary (Azul Pro):     #0EA5E9  (sky-500 de Tailwind)
Secondary (Verde):      #10B981  (emerald-500)
Accent (Naranja):       #FF6B35  (inspirado en Qamarero, más vibrante)
Dark (Carbón):          #1F2937  (gray-800)
```

### Colores Secundarios
```
Success (Verde):        #10B981
Warning (Naranja):      #F97316  (orange-500)
Error (Rojo):           #EF4444  (red-500)
Info (Azul):            #0EA5E9
```

### Colores Neutros
```
Blanco:                 #FFFFFF
Gris Claro:             #F3F4F6  (gray-100) - backgrounds
Gris Medio:             #D1D5DB  (gray-300) - borders
Gris Oscuro:            #6B7280  (gray-500) - text secundario
Negro:                  #1F2937  (gray-800) - text principal
```

### Modo Claro (Default)
```
Background:             #FFFFFF
Surface (Cards):        #F9FAFB  (gray-50)
Border:                 #E5E7EB  (gray-200)
Text Principal:         #1F2937  (gray-800)
Text Secundario:        #6B7280  (gray-500)
```

---

## 🔤 Tipografía

### Fuente Principal
```
Font: Inter (moderna, limpia, profesional)
Weights: 400, 500, 600, 700
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

### Escala de Tamaños
```
Display (H1):  2.5rem / 48px - Títulos grandes en landing
Title (H2):    2rem / 32px - Títulos secciones
Heading (H3):  1.5rem / 24px - Subtítulos
Subhead (H4):  1.25rem / 20px - Pequeños títulos
Body Large:    1rem / 16px - Texto principal
Body Normal:   0.875rem / 14px - Texto normal
Body Small:    0.75rem / 12px - Pequeño
Label:         0.625rem / 10px - Etiquetas
```

### Line Height
```
Heading:       1.2
Body:          1.6
Tight:         1.4
```

---

## 🎯 Componentes

### Botones

#### Primario (Azul)
```css
Background: #0EA5E9
Hover: #0284C7 (más oscuro)
Text: #FFFFFF
Padding: 12px 24px
Border-radius: 8px
Font-weight: 600
Shadow: 0 1px 2px rgba(0,0,0,0.05)
Transition: all 200ms ease
```

#### Secundario (Blanco + Border)
```css
Background: #FFFFFF
Border: 1px solid #E5E7EB
Hover Background: #F9FAFB
Text: #1F2937
Padding: 12px 24px
Border-radius: 8px
```

#### Success (Verde)
```css
Background: #10B981
Hover: #059669
Text: #FFFFFF
```

#### Danger (Rojo)
```css
Background: #EF4444
Hover: #DC2626
Text: #FFFFFF
```

### Cards
```css
Background: #FFFFFF
Border: 1px solid #E5E7EB
Border-radius: 12px
Padding: 24px
Shadow: 0 1px 3px rgba(0,0,0,0.1)
Hover Shadow: 0 4px 6px rgba(0,0,0,0.15)
Transition: all 300ms ease
```

### Inputs
```css
Background: #FFFFFF
Border: 1px solid #D1D5DB
Focus Border: #0EA5E9 (2px)
Border-radius: 8px
Padding: 12px 16px
Font-size: 16px (previene zoom iOS)
```

### Badges/Tags
```css
Background: #DDD6FE (purple-100 suave)
Text: #6366F1 (indigo-500)
Border-radius: 20px
Padding: 4px 12px
Font-size: 12px
Font-weight: 600
```

---

## 📐 Espaciado

Sistema de 4px base:
```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

Aplicado en:
- Padding (interior de componentes)
- Margin (espacio entre elementos)
- Gap (espaciado en grillas/flex)

---

## 🔍 Sombras

```
Subtle:    0 1px 2px rgba(0,0,0,0.05)
Small:     0 1px 3px rgba(0,0,0,0.1)
Medium:    0 4px 6px rgba(0,0,0,0.1)
Large:     0 10px 15px rgba(0,0,0,0.1)
XL:        0 20px 25px rgba(0,0,0,0.15)
```

---

## 📦 Breakpoints (Tailwind)

```
sm:   640px
md:   768px
lg:   1024px
xl:   1280px
2xl:  1536px
```

---

## 🎨 Tema Tailwind Actualizado

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9',
        secondary: '#10B981',
        accent: '#FF6B35',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.1)',
      },
    },
  },
}
```

---

## 🖼️ Componentes Visual Esperados

### Header/Navbar
```
Fondo: #FFFFFF
Border-bottom: 1px solid #E5E7EB
Logo + navegación en gris oscuro
Botones primarios azules
```

### Hero Section (Landing)
```
Fondo: Gradiente de azul (#0EA5E9 a #0284C7)
Texto: Blanco
CTA: Verde (#10B981)
Imagen: Foto de restaurante profesional
```

### Feature Cards
```
Cards blancas con border sutil
Iconos primarios (azul)
Texto claro en gris oscuro
Hover: sombra más grande, light lift
```

### Dashboard/TPV
```
Sidebar gris claro (#F3F4F6)
Contenido blanco
Botones: Azul primario
Métricas: Verde para positivo, rojo para negatividad
Tablas: Filas alternadas (blanco y gris-50)
```

### Kitchen Display
```
Fondo oscuro (#1F2937)
Tickets blancos/claros
Urgencia: Colores de status (verde, naranja, rojo)
Tipografía grande y legible
```

---

## 🎬 Animaciones

### Transiciones
```
Button hover:   200ms ease
Card hover:     300ms ease
Fade in:        400ms ease-out
Slide:          300ms ease-out
```

### Efectos
- Hover: Sombra y escala suave (1.02)
- Focus: Border azul + sombra
- Active: Color más oscuro
- Loading: Spinner azul primario

---

## 📱 Responsive Design

### Mobile (< 768px)
- Full width con padding lateral (16px)
- Tipografía escalada down 10%
- Botones más grandes (44px altura mínima)
- Single column layouts

### Tablet (768px - 1024px)
- 2 columnas máximo
- Navegación horizontal
- Cards más grandes

### Desktop (> 1024px)
- Multi-columnas
- Layout completo
- Espaciado generoso

---

## 🎯 Ejemplos por Página

### Landing/Home
- Hero: Azul gradient + blanco
- Features: 3-4 cards claros
- Testimonios: Fondo gris-50
- CTA: Verde grande

### TPV/POS
- Sidebar: Gris claro
- Menu items: Cards blancas
- Cart: Lado derecho, border azul
- Total: Verde grande
- Pagar: Botón primario grande

### Dashboard
- Métricas: Cards con iconos
- Gráficos: Línea azul, fondo limpio
- Tabla: Borders claros
- Filtros: Inputs con focus azul

### Administración (Productos, etc)
- Tabla limpia con borders sutiles
- Botones acciones: Iconos pequeños
- Modales: Fondo blanco, shadow grande
- Confirmación: Rojo para delete

---

## ✅ Checklist de Implementación

- [ ] Actualizar tailwind.config.js con nuevos colores
- [ ] Cambiar fuente a Inter (Google Fonts)
- [ ] Reemplazar colores en componentes principales:
  - [ ] Navbar
  - [ ] Botones
  - [ ] Cards
  - [ ] Inputs
  - [ ] Tabs
  - [ ] Alerts/Toasts
- [ ] Actualizar hero/landing page
- [ ] Reskinear TPV (colores, espaciado)
- [ ] Reskinear Dashboard
- [ ] Reskinear Kitchen Display
- [ ] Testing en mobile/tablet/desktop
- [ ] Screenshots para marketing

---

## 🚀 Resultado Final

**Antes:** Dark mode básico, poco profesional
**Después:** Light mode moderno, profesional, que compite con Qamarero + TurboPOS

**Ventaja Visual:**
- ✅ Más moderno que TurboPOS (dark pesado)
- ✅ Más profesional que Qamarero (naranja muy vibrante)
- ✅ Combinación de lo mejor de ambos
- ✅ Atrae restaurantes pequeños y medianos
