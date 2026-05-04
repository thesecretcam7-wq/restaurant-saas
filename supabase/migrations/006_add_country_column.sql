-- Add country column to tenants table if it doesn't exist
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'CO';

-- Update the existing tenant to ES for testing
UPDATE tenants
SET country = 'ES'
WHERE id = 'dc28f9eb-aae1-43cf-9aa8-9a9eaaf61582';
