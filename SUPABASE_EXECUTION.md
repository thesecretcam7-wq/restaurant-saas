# 🚀 INSTRUCCIONES: Ejecutar Migraciones en Supabase

## Archivos de Migración Listos

Están localizados en: `supabase/migrations/`

```
supabase/migrations/
├── 007_printer_devices.sql          (93 líneas)
└── 007b_extend_restaurant_settings.sql (9 líneas)
```

---

## Ejecución Paso a Paso

### 1️⃣ Abre Supabase Dashboard
```
https://app.supabase.com
→ Selecciona tu proyecto "Restaurant" (csdooyggiuhzovehykna)
```

### 2️⃣ Primera Migración (printer_devices)

En el dashboard:
1. **SQL Editor** → **New Query**
2. Copia **TODO** el contenido de `007_printer_devices.sql`
3. Pégalo en el editor
4. Click **RUN** ▶️ (esquina superior derecha)
5. Espera confirmación ✅

**Resultado esperado:**
- Tabla `printer_devices` creada
- Tabla `printer_logs` creada  
- 8 RLS policies aplicadas
- 6 índices creados

### 3️⃣ Segunda Migración (extend_restaurant_settings)

1. **SQL Editor** → **New Query**
2. Copia **TODO** el contenido de `007b_extend_restaurant_settings.sql`
3. Pégalo en el editor
4. Click **RUN** ▶️
5. Espera confirmación ✅

**Resultado esperado:**
- 6 nuevas columnas en `restaurant_settings`
- Todas con valores por defecto

### 4️⃣ Verificación en Supabase

**Table Editor:**
- ✅ `printer_devices` existe
- ✅ `printer_logs` existe

**En `restaurant_settings`:**
- ✅ `default_receipt_printer_id` (UUID ref)
- ✅ `kitchen_printer_id` (UUID ref)
- ✅ `printer_auto_print` (boolean, default: false)
- ✅ `printer_paper_width` (int, default: 80)
- ✅ `printer_settings` (JSONB, default: {})

---

## 🎯 Después de Ejecutar las Migraciones

### 1. Inicia la aplicación
```bash
cd restaurant-saas
npm run dev
```

Debería compilar sin errores.

### 2. Prueba la interfaz de impresoras
```
http://localhost:3000/restaurant.sv/admin/configuracion/impresoras
```
(Reemplaza `restaurant.sv` con tu dominio)

### 3. Intenta agregar una impresora
- Click en **"Agregar Impresora"**
- Debería abrir un selector de dispositivos USB
- Si no tienes impresora: Verás mensaje "WebUSB no soportado"

### 4. Haz una venta test
1. Accede a TPV
2. Agrega un artículo
3. Completa el pago
4. La orden debería guardarse correctamente

---

## ⚠️ Si Algo Sale Mal

### Error: "Relation printer_devices already exists"
→ **Es normal.** Las migraciones usan `IF NOT EXISTS`
→ Continúa normalmente

### Error: "Column already exists"
→ **Es normal.** Es la segunda ejecución
→ Continúa normalmente

### La página `/impresoras` da error 404
→ Asegúrate de haber ejecutado **ambas** migraciones
→ Verifica en Table Editor que las tablas existan

### "WebUSB no soportado en este navegador"
→ **Esperado en Firefox/Safari**
→ Usa Chrome, Edge o Brave
→ Fallback automático a browser print

---

## ✅ Lista de Verificación Final

- [ ] Ejecuté la migración 007_printer_devices.sql
- [ ] Ejecuté la migración 007b_extend_restaurant_settings.sql
- [ ] Verifiqué que `printer_devices` existe en Table Editor
- [ ] Verifiqué que `printer_logs` existe en Table Editor
- [ ] Verifiqué las 5 nuevas columnas en `restaurant_settings`
- [ ] Inicié `npm run dev`
- [ ] Accedí a la página `/admin/configuracion/impresoras`
- [ ] Vi el botón "Agregar Impresora"
- [ ] Hice una venta de prueba

---

## 📞 ¿Necesitas Ayuda?

Si algo no funciona:
1. Copia el mensaje de error exacto
2. Verifica que las migraciones se ejecutaron (Table Editor)
3. Reinicia con `npm run dev`
4. Abre el navegador en incógnito (limpia cache)

