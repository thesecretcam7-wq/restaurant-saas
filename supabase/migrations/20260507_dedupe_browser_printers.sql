WITH ranked_browser_printers AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY COALESCE(is_default, false) DESC, created_at DESC
    ) AS rn
  FROM printer_devices
  WHERE config->>'connection_mode' = 'browser_driver'
     OR (vendor_id IS NULL AND product_id IS NULL)
)
DELETE FROM printer_devices AS device
USING ranked_browser_printers AS ranked
WHERE device.id = ranked.id
  AND ranked.rn > 1;
