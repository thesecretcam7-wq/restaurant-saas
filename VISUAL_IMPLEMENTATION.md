# 🎨 Visual Implementation Checklist

**Objetivo:** Transformar el frontend a Light Mode profesional que compita con Qamarero + TurboPOS

---

## ✅ PALETA ACTUALIZADA (Ya hecha)

- [x] Colors variables en `globals.css` actualizados
- [x] Tailwind v4 OKLch colors configurados
- [ ] Google Fonts (Inter) importada

**Agregar a globals.css (arriba de @import "tailwindcss"):**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

---

## 📝 TIPOGRAFÍA

### Actualizar font-family en globals.css:

```css
@theme inline {
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "Courier New", monospace;
  --font-heading: "Inter", system-ui, sans-serif;
}
```

---

## 🎯 COMPONENTES A ACTUALIZAR

### 1. Navbar/Header
**Archivo:** `components/layout/Navbar.tsx` (o similar)

**Cambios:**
- [ ] Fondo: blanco (`bg-background`)
- [ ] Border-bottom: sutil gris (`border-b border-border`)
- [ ] Logo: gris oscuro
- [ ] Botón primario: azul (`bg-primary text-white`)
- [ ] Logout: gris secundario

**Antes:**
```jsx
<nav className="bg-gray-900"> {/* Dark */}
```

**Después:**
```jsx
<nav className="bg-background border-b border-border">
```

---

### 2. Botones

**Archivo:** `components/ui/button.tsx` (si existe) o componentes que usen botones

**Cambios primarios:**
```jsx
<button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md font-semibold transition">
  Pagar Ahora
</button>
```

**Cambios secundarios:**
```jsx
<button className="bg-white border border-border hover:bg-muted text-foreground px-6 py-3 rounded-md">
  Cancelar
</button>
```

---

### 3. Cards
**Archivo:** `components/ui/card.tsx` (si existe)

**Cambios:**
```jsx
<div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition">
  {/* Contenido */}
</div>
```

---

### 4. Landing/Hero Page
**Archivo:** `app/[domain]/page.tsx`

**Cambios:**
- [ ] Hero background: Gradiente azul (`from-primary to-blue-600`)
- [ ] Hero text: Blanco
- [ ] Botón CTA: Verde (`bg-secondary`)
- [ ] Feature cards: Blancas con border
- [ ] Testimonios background: Gris claro (`bg-muted`)

**Ejemplo Hero:**
```jsx
<section className="bg-gradient-to-r from-primary to-blue-600 text-white py-20">
  <h1 className="text-4xl font-bold">TPV para Restaurantes</h1>
  <button className="mt-6 bg-secondary hover:bg-secondary/90 text-white px-8 py-4 rounded-md font-semibold">
    Empezar Gratis
  </button>
</section>
```

---

### 5. TPV/POS Terminal
**Archivo:** `components/admin/POSTerminal.tsx`

**Cambios:**
- [ ] Sidebar: gris claro (`bg-muted`)
- [ ] Menu items: cards blancas
- [ ] Productos: grid con cards
- [ ] Cart side: border azul primario
- [ ] Total: verde grande
- [ ] Botón Pagar: azul primario grande

**Ejemplo:**
```jsx
<div className="flex">
  {/* Sidebar */}
  <aside className="w-64 bg-muted border-r border-border">
    {/* Categories */}
  </aside>
  
  {/* Main */}
  <main className="flex-1 bg-background p-6">
    {/* Product grid */}
    <div className="grid grid-cols-4 gap-4">
      {/* Cards blancos */}
      <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md cursor-pointer">
        {/* Product */}
      </div>
    </div>
  </main>
  
  {/* Cart */}
  <aside className="w-80 bg-background border-l-4 border-primary">
    {/* Cart items */}
    <div className="mt-auto">
      <div className="text-2xl font-bold text-secondary mb-4">
        Total: $XX.XX
      </div>
      <button className="w-full bg-primary text-white py-4 rounded-md font-bold text-lg">
        PAGAR
      </button>
    </div>
  </aside>
</div>
```

---

### 6. Dashboard
**Archivo:** `app/[domain]/admin/dashboard/page.tsx`

**Cambios:**
- [ ] Cards de métricas: blancas con iconos azules
- [ ] Títulos: gris oscuro
- [ ] Números: azul primario (grandes)
- [ ] Gráficos: línea azul, fondo limpio
- [ ] Tablas: borders claros, alternancia blanco/gris

**Ejemplo:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Métrica Card */}
  <div className="bg-card border border-border rounded-lg p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-sm">Ingresos Hoy</p>
        <p className="text-3xl font-bold text-primary">$1,250</p>
      </div>
      <DollarIcon className="text-primary w-8 h-8" />
    </div>
  </div>
</div>
```

---

### 7. Kitchen Display System (KDS)
**Archivo:** `components/admin/KDSScreen.tsx`

**Cambios:**
- [ ] Fondo: Blanco limpio
- [ ] Tickets: Cards con estado visual
- [ ] Estado: Verde (pendiente), Naranja (preparando), Rojo (retrasado)
- [ ] Urgencia: Borde rojo para órdenes viejas

**Ejemplo:**
```jsx
<div className="bg-background min-h-screen p-6">
  <h1 className="text-3xl font-bold text-foreground mb-6">Kitchen Display</h1>
  
  <div className="grid grid-cols-3 gap-4">
    {orders.map(order => (
      <div 
        key={order.id}
        className={`bg-card border-2 rounded-lg p-6 ${
          order.status === 'pending' ? 'border-secondary' :
          order.status === 'preparing' ? 'border-accent' :
          'border-destructive'
        }`}
      >
        <h3 className="text-lg font-bold">{order.orderNumber}</h3>
        {/* Items */}
      </div>
    ))}
  </div>
</div>
```

---

### 8. Admin Panels (Productos, Órdenes, etc)
**Archivo:** `app/[domain]/admin/**/*.tsx`

**Cambios:**
- [ ] Tablas: bg-card, borders sutiles
- [ ] Headers: gris oscuro bold
- [ ] Botones acción: Iconos pequeños, hover subtle
- [ ] Modales: Fondo blanco, shadow grande
- [ ] Confirmación delete: Rojo destructive

**Ejemplo Tabla:**
```jsx
<table className="w-full">
  <thead className="bg-muted border-b border-border">
    <tr>
      <th className="text-left p-4 font-semibold text-foreground">Producto</th>
      <th className="text-left p-4 font-semibold text-foreground">Precio</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => (
      <tr key={product.id} className="border-b border-border hover:bg-muted">
        <td className="p-4">{product.name}</td>
        <td className="p-4">${product.price}</td>
      </tr>
    ))}
  </tbody>
</table>
```

---

### 9. Inputs & Forms
**Cambios:**
- [ ] Background: blanco (`bg-white`)
- [ ] Border: gris claro (`border border-border`)
- [ ] Focus: border azul 2px (`focus:border-primary focus:ring-2 focus:ring-primary/20`)
- [ ] Placeholder: gris medio

```jsx
<input 
  className="w-full px-4 py-2 border border-border rounded-md bg-white text-foreground placeholder-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
  placeholder="Buscar producto..."
/>
```

---

### 10. Alerts & Toasts
**Cambios:**
- [ ] Success: Verde fondo claro + borde verde
- [ ] Error: Rojo fondo claro + borde rojo
- [ ] Info: Azul fondo claro + borde azul
- [ ] Warning: Naranja fondo claro + borde naranja

```jsx
<div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
  ✓ Pago completado correctamente
</div>
```

---

## 🔄 CAMBIOS GLOBALES

### Remove Dark Mode Classes

Si tienes `.dark` classes en componentes, elimínalas o haz que sean redundantes:

```jsx
// Antes
<div className="bg-gray-900 dark:bg-gray-900">

// Después (solo light mode)
<div className="bg-white">
```

---

## 📱 RESPONSIVE

Mantener estructura grid responsive:

```jsx
// Mobile: 1 col, Tablet: 2 col, Desktop: 3+ col
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

---

## 🧪 TESTING CHECKLIST

### Visual Testing
- [ ] Landing page se ve moderna y limpia
- [ ] TPV se ve profesional con colores claros
- [ ] Botones tienen buen contraste y son clickeables
- [ ] Cards tienen sombras sutiles
- [ ] Dashboard muestra métricas claramente
- [ ] KDS es fácil de leer

### Device Testing
- [ ] Mobile (375px): Todo legible
- [ ] Tablet (768px): Layout funciona
- [ ] Desktop (1280px+): Espaciado generoso

### Browser Testing
- [ ] Chrome: OK
- [ ] Firefox: OK
- [ ] Safari: OK
- [ ] Mobile Safari: OK

---

## 📸 SCREENSHOTS PARA MARKETING

Una vez completo, tomar screenshots de:
- [ ] Landing page hero
- [ ] Feature cards
- [ ] TPV con operación
- [ ] Dashboard con métricas
- [ ] KDS completo
- [ ] Mobile view

---

## 🎯 ORDEN DE IMPLEMENTACIÓN

### Priority 1 (Máximo impacto)
1. Landing page (hero + cards)
2. Colores globals ✅ (ya hecho)
3. TPV Terminal (lo más visible)

### Priority 2 (Cuando se vea bien)
4. Dashboard
5. Admin panels
6. KDS

### Priority 3 (Polish)
7. Animaciones suaves
8. Transiciones hover
9. Responsive mobile

---

## ⏱️ TIEMPO ESTIMADO

- Landing: 2 horas
- TPV: 3 horas
- Dashboard: 2 horas
- Admin: 2 horas
- KDS: 1 hora
- Testing: 2 horas

**Total: ~12 horas = 1-2 días full time**

---

## ✨ RESULTADO ESPERADO

**Antes:** Plataforma oscura, poco profesional
**Después:** Plataforma clara, moderna, competitiva con líderes del mercado

**Ventaja:** 
- Atrae a pequeños/medianos restaurantes
- Se ve más profesional que TurboPOS
- Más moderno que Qamarero
- Excelente para marketing

---

**Empecemos por la landing page. ¿Comenzamos?** 🚀
