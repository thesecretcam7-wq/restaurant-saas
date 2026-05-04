-- Fase 3.1: Printer Devices and Logging Tables
-- Create tables for managing thermal printer devices and print operations

-- Table: printer_devices
-- Stores configuration for thermal printers (USB, network, etc.)
CREATE TABLE IF NOT EXISTS printer_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT DEFAULT 'receipt', -- 'receipt', 'kitchen', 'scale'
  vendor_id INT, -- USB Vendor ID (e.g., 0x04b8 for Epson)
  product_id INT, -- USB Product ID
  serial_number TEXT,
  is_default BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  last_used_at TIMESTAMPTZ,
  config JSONB DEFAULT '{"paper_width": 80, "auto_print": true, "copies": 1}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_printer_devices_tenant_id ON printer_devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_printer_devices_is_default ON printer_devices(is_default);
CREATE INDEX IF NOT EXISTS idx_printer_devices_created_at ON printer_devices(created_at DESC);

-- Table: printer_logs
-- Audit trail for printer operations (connections, prints, errors)
CREATE TABLE IF NOT EXISTS printer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id UUID REFERENCES printer_devices(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'connect', 'disconnect', 'print', 'test', 'config', 'error'
  status TEXT, -- 'success', 'error', 'warning'
  error_message TEXT,
  details JSONB, -- { orderId, itemCount, pageWidth, etc }
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_printer_logs_tenant_id ON printer_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_printer_logs_device_id ON printer_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_printer_logs_created_at ON printer_logs(created_at DESC);

-- Row Level Security (RLS) for printer_devices
ALTER TABLE printer_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own printers"
  ON printer_devices
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_devices.tenant_id)
  );

CREATE POLICY "Tenants can create printers"
  ON printer_devices
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_devices.tenant_id)
  );

CREATE POLICY "Tenants can update their own printers"
  ON printer_devices
  FOR UPDATE
  USING (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_devices.tenant_id)
  );

CREATE POLICY "Tenants can delete their own printers"
  ON printer_devices
  FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_devices.tenant_id)
  );

-- Row Level Security (RLS) for printer_logs
ALTER TABLE printer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own printer logs"
  ON printer_logs
  FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_logs.tenant_id)
  );

CREATE POLICY "System can insert printer logs"
  ON printer_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM tenants WHERE id = printer_logs.tenant_id)
  );
