'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type WakeLockSentinel = {
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
  removeEventListener: (type: 'release', listener: () => void) => void
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>
  }
}

export function useWakeLock() {
  const [active, setActive] = useState(false)
  const [supported, setSupported] = useState(false)
  const wantedRef = useRef(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    setSupported(typeof navigator !== 'undefined' && 'wakeLock' in navigator)
  }, [])

  const releaseWakeLock = useCallback(async () => {
    wantedRef.current = false
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    setActive(false)

    if (sentinel) {
      try {
        await sentinel.release()
      } catch {}
    }
  }, [])

  const requestWakeLock = useCallback(async () => {
    wantedRef.current = true

    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      setSupported(false)
      setActive(false)
      return false
    }

    try {
      if (sentinelRef.current) {
        setActive(true)
        return true
      }

      const sentinel = await (navigator as WakeLockNavigator).wakeLock!.request('screen')
      sentinelRef.current = sentinel
      setSupported(true)
      setActive(true)

      const handleRelease = () => {
        sentinelRef.current = null
        setActive(false)
      }

      sentinel.addEventListener('release', handleRelease)
      return true
    } catch {
      sentinelRef.current = null
      setActive(false)
      return false
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && wantedRef.current && !sentinelRef.current) {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel) sentinel.release().catch(() => {})
    }
  }, [requestWakeLock])

  return {
    wakeLockActive: active,
    wakeLockSupported: supported,
    activateWakeLock: requestWakeLock,
    releaseWakeLock,
  }
}
