'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

type SalesAutoRefreshProps = {
  intervalMs?: number
}

export function SalesAutoRefresh({ intervalMs = 5000 }: SalesAutoRefreshProps) {
  const router = useRouter()
  const refreshingRef = useRef(false)

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== 'visible' || refreshingRef.current) return

      const activeElement = document.activeElement
      const isEditing = activeElement instanceof HTMLInputElement
        || activeElement instanceof HTMLTextAreaElement
        || activeElement instanceof HTMLSelectElement

      if (isEditing) return

      refreshingRef.current = true
      router.refresh()
      window.setTimeout(() => {
        refreshingRef.current = false
      }, 750)
    }

    const interval = window.setInterval(refresh, intervalMs)
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [intervalMs, router])

  return null
}
