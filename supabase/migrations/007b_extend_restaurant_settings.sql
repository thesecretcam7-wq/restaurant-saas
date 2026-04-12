-- Fase 3.1b: Extend restaurant_settings table
-- Add printer configuration columns to restaurant_settings

ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS default_receipt_printer_id UUID REFERENCES printer_devices(id);
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS kitchen_printer_id UUID REFERENCES printer_devices(id);
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS printer_auto_print BOOLEAN DEFAULT false;
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS printer_paper_width INT DEFAULT 80; -- 58 or 80mm
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS printer_settings JSONB DEFAULT '{}';
ALTER TABLE restaurant_settings ADD COLUMN IF NOT EXISTS printer_updated_at TIMESTAMPTZ DEFAULT now();
