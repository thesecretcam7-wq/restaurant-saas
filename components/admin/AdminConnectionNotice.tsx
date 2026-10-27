'use client'

import { useEffect, useState, useTransition } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'

export function AdminConnectionNotice({ unavailable = false, onRetry }: { unavailable?: boolean; onRetry?: () => void }) {
  const [offline, setOffline] = useState(false)
  const [retrying, startTransition] = useTransition()

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline && !unavailable) return null

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <WifiOff className="size-5 shrink-0" />
      <p className="min-w-0 flex-1">
        {offline ? 'Sin conexion. Las ventas no se estan actualizando.' : 'No se pudo conectar al sistema. Intenta de nuevo en un minuto.'}
      </p>
      <button type="button" disabled={offline || retrying} onClick={() => {
        if (onRetry) startTransition(onRetry)
        else window.location.reload()
      }} className="inline-flex items-center gap-2 font-bold disabled:opacity-50">
        <RefreshCw className={`size-4 ${retrying ? 'animate-spin' : ''}`} />{retrying ? 'Reintentando...' : 'Reintentar'}
      </button>
    </div>
  )
}
