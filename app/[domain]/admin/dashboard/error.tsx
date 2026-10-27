'use client'

import { AdminConnectionNotice } from '@/components/admin/AdminConnectionNotice'
import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

export default function DashboardError({ error, unstable_retry }: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const { domain } = useParams<{ domain: string }>()
  useEffect(() => { console.error('[dashboard load]', error) }, [error])

  return (
    <div>
      <AdminConnectionNotice unavailable onRetry={unstable_retry} />
      <Link href={`/${encodeURIComponent(domain)}/staff/pos`} className="admin-button-primary">
        <ShoppingBag className="size-4" />Abrir TPV
      </Link>
      {error.digest && <p className="mt-3 text-xs text-black/50">Referencia: {error.digest}</p>}
    </div>
  )
}
