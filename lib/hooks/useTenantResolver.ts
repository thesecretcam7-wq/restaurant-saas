import { useState, useEffect } from 'react'

export function useTenantResolver(slug: string) {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [country, setCountry] = useState<string>('CO')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/tenant/resolve?slug=${encodeURIComponent(slug)}`)
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setTenantId(data.id)
          setCountry(data.country || 'CO')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [slug])

  return { tenantId, country, loading }
}
