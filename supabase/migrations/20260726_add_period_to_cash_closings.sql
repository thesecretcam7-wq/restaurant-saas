ALTER TABLE public.cash_closings
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMPTZ;

COMMENT ON COLUMN public.cash_closings.period_start IS 'Operational period start included in this cash closing.';
COMMENT ON COLUMN public.cash_closings.period_end IS 'Operational period end included in this cash closing.';

CREATE INDEX IF NOT EXISTS idx_cash_closings_tenant_period
  ON public.cash_closings (tenant_id, period_start, period_end);

WITH parsed AS (
  SELECT
    c.id,
    COALESCE(
      NULLIF(rs.timezone, ''),
      CASE UPPER(COALESCE(rs.country, t.country, 'ES'))
        WHEN 'CO' THEN 'America/Bogota'
        WHEN 'ES' THEN 'Europe/Madrid'
        WHEN 'MX' THEN 'America/Mexico_City'
        WHEN 'US' THEN 'America/New_York'
        WHEN 'AR' THEN 'America/Buenos_Aires'
        WHEN 'PE' THEN 'America/Bogota'
        WHEN 'CL' THEN 'America/Santiago'
        ELSE 'Europe/Madrid'
      END
    ) AS time_zone,
    regexp_match(
      c.notes,
      'Periodo operativo:\s*(\d{1,2})/(\d{1,2})/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*-\s*(\d{1,2})/(\d{1,2})/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})'
    ) AS parts
  FROM public.cash_closings c
  LEFT JOIN public.tenants t ON t.id = c.tenant_id
  LEFT JOIN public.restaurant_settings rs ON rs.tenant_id = c.tenant_id
  WHERE c.notes LIKE 'Periodo operativo:%'
    AND (c.period_start IS NULL OR c.period_end IS NULL)
),
normalized AS (
  SELECT
    id,
    make_timestamptz(
      (parts[3])::int,
      (parts[2])::int,
      (parts[1])::int,
      (parts[4])::int,
      (parts[5])::int,
      (parts[6])::double precision,
      time_zone
    ) AS parsed_period_start,
    make_timestamptz(
      (parts[9])::int,
      (parts[8])::int,
      (parts[7])::int,
      (parts[10])::int,
      (parts[11])::int,
      (parts[12])::double precision,
      time_zone
    ) AS parsed_period_end
  FROM parsed
  WHERE parts IS NOT NULL
)
UPDATE public.cash_closings c
SET
  period_start = COALESCE(c.period_start, normalized.parsed_period_start),
  period_end = COALESCE(c.period_end, normalized.parsed_period_end)
FROM normalized
WHERE normalized.id = c.id;

UPDATE public.cash_closings
SET
  period_end = COALESCE(period_end, closed_at),
  period_start = COALESCE(period_start, closed_at - INTERVAL '1 day')
WHERE closed_at IS NOT NULL
  AND (period_start IS NULL OR period_end IS NULL);
