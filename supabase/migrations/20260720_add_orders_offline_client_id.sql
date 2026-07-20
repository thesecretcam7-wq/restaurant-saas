-- Prevent duplicate POS offline sales from concurrent sync requests.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offline_client_id text;

WITH parsed AS (
  SELECT
    id,
    substring(notes FROM 'ID offline ([A-Za-z0-9-]+)') AS offline_id,
    row_number() OVER (
      PARTITION BY tenant_id, substring(notes FROM 'ID offline ([A-Za-z0-9-]+)')
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.orders
  WHERE offline_client_id IS NULL
    AND notes ~* 'ID offline [A-Za-z0-9-]+'
)
UPDATE public.orders o
SET offline_client_id = parsed.offline_id
FROM parsed
WHERE o.id = parsed.id
  AND parsed.offline_id IS NOT NULL
  AND parsed.duplicate_rank = 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tenant_offline_client_id_unique
  ON public.orders (tenant_id, offline_client_id)
  WHERE offline_client_id IS NOT NULL;
