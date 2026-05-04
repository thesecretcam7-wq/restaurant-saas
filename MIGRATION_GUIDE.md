# Guía de Ejecución: Migraciones Fase 3 (Impresoras)

## ✅ Archivos de Migración Creados

- `supabase/migrations/007_printer_devices.sql` - Tablas y RLS para dispositivos
- `supabase/migrations/007b_extend_restaurant_settings.sql` - Extensión de restaurant_settings

## 🚀 Cómo Ejecutar las Migraciones

### Opción 1: SQL Editor en Supabase Dashboard (Recomendado)

1. Abre [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto "Restaurant"
3. Ve a **SQL Editor** en el menú lateral
4. Haz clic en **New Query** o **New SQL File**

#### Migración 1: Crear tablas printer_devices y printer_logs

5. Copia todo el contenido de `supabase/migrations/007_printer_devices.sql`
6. Pégalo en el editor SQL
7. Haz clic en **RUN** (esquina superior derecha)
8. Verifica que se ejecute sin errores

#### Migración 2: Extender restaurant_settings

9. Abre una **Nueva Query**
10. Copia todo el contenido de `supabase/migrations/007b_extend_restaurant_settings.sql`
11. Pégalo en el editor SQL
12. Haz clic en **RUN**
13. Verifica que se ejecute sin errores

### Opción 2: Via Supabase CLI (Si está instalado)

```bash
cd restaurant-saas
supabase migration list
supabase db push
```

---

## ✅ Verificación Post-Migraciones

Después de ejecutar ambas migraciones, verifica en Supabase:

1. Ve a **Table Editor** 
2. Busca las nuevas tablas:
   - `printer_devices` ✓
   - `printer_logs` ✓

3. En `restaurant_settings`, verifica las nuevas columnas:
   - `default_receipt_printer_id` ✓
   - `kitchen_printer_id` ✓
   - `printer_auto_print` ✓
   - `printer_paper_width` ✓
   - `printer_settings` ✓

---

## 📋 Siguientes Pasos

Una vez ejecutadas las migraciones:

1. ✅ Inicia la app: `npm run dev`
2. ✅ Ve a `/[domain]/admin/configuracion/impresoras`
3. ✅ Prueba agregar una impresora (si tienes USB conectada)
4. ✅ Prueba el botón "Test" para imprimir página de ejemplo
5. ✅ Realiza una venta y verifica la impresión automática

---

## ⚠️ Si ocurren errores

Si ves errores como:
- "Table already exists" → Es normal con `IF NOT EXISTS`
- "Policy already exists" → Verifica que sea la primera ejecución
- Otros errores → Copia el mensaje de error y avísame

