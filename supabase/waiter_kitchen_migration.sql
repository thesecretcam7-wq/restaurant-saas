-- ============================================================
-- MIGRACIÓN: Sistema Mesero / Cocina
-- Correr en Supabase > SQL Editor
-- ============================================================

-- 1. Agregar columnas a tabla orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name TEXT;

-- 2. Agregar PINs de acceso a restaurant_settings
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS waiter_pin VARCHAR(6);
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS kitchen_pin VARCHAR(6);

-- 3. Habilitar Realtime para la tabla orders (para la pantalla cocina)
-- En Supabase: Database > Replication > Orders > Enable
-- O con SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ============================================================
-- NOTAS:
-- - delivery_type ya es TEXT, soporta el nuevo valor 'dine-in'
-- - status ya soporta los valores existentes, 'ready' es nuevo
-- - waiter_pin y kitchen_pin son PINs de 4-6 dígitos configurados por el admin
-- ============================================================
