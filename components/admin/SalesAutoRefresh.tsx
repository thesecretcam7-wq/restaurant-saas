'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { createRefreshGate } from '@/lib/refresh-gate'

type SalesAutoRefreshProps = {
  updatedAt: number
  timeZone: string
}

export function SalesAutoRefresh({ updatedAt, timeZone }: SalesAutoRefreshProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [offline, setOffline] = useState(false)
  const gate = useRef(createRefreshGate(updatedAt))
  const wasPending = useRef(false)
  const requestedSnapshot = useRef(updatedAt)
  const lastSnapshot = useRef(updatedAt)

  useEffect(() => {
    if (pending) wasPending.current = true
    else if (wasPending.current) {
      wasPending.current = false
      gate.current.complete(updatedAt !== requestedSnapshot.current)
    }
  }, [pending, updatedAt])

  const refresh = useCallback((force = false) => {
    if (pending) return
    const activeElement = document.activeElement
    const editing = activeElement instanceof HTMLInputElement
      || activeElement instanceof HTMLTextAreaElement
      || activeElement instanceof HTMLSelectElement
    if (!gate.current.begin({ online: navigator.onLine, visible: document.visibilityState === 'visible', editing, force })) return
    requestedSnapshot.current = updatedAt
    startTransition(() => router.refresh())
  }, [pending, router, updatedAt])

  useEffect(() => {
    if (lastSnapshot.current !== updatedAt) {
      lastSnapshot.current = updatedAt
      gate.current.complete(true)
    }
  }, [updatedAt])

  useEffect(() => {
    const refreshOnReturn = () => {
      setOffline(!navigator.onLine)
      refresh()
    }
    refreshOnReturn()
    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener('pageshow', refreshOnReturn)
    window.addEventListener('online', refreshOnReturn)
    window.addEventListener('offline', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)

    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener('pageshow', refreshOnReturn)
      window.removeEventListener('online', refreshOnReturn)
      window.removeEventListener('offline', refreshOnReturn)
      document.removeEventListener('visibilitychange', refreshOnReturn)
    }
  }, [refresh])

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-black/55" aria-live="polite">
      <span>{pending ? 'Actualizando ventas...' : offline ? 'Sin conexion. Datos sin actualizar.' : 'Actualizado:'}</span>
      {!pending && <time dateTime={new Date(updatedAt).toISOString()}>{new Date(updatedAt).toLocaleTimeString('es-ES', { timeZone })}</time>}
      <button type="button" title="Actualizar ventas" aria-label="Actualizar ventas" disabled={pending || offline} onClick={() => refresh(true)} className="inline-flex size-9 items-center justify-center rounded-lg border border-black/15 disabled:opacity-50">
        <RefreshCw className={`size-4 ${pending ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )
}
