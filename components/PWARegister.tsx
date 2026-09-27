'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function PWARegister() {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    if (!window.isSecureContext) {
      return
    }

    if (process.env.NODE_ENV === 'development') {
      const clearDevelopmentPwa = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          const cacheNames = 'caches' in window ? await window.caches.keys() : []
          const eccofoodCaches = cacheNames.filter((name) => name.startsWith('eccofood-'))
          const hadStoredPwa = registrations.length > 0 || eccofoodCaches.length > 0

          await Promise.all([
            ...registrations.map((registration) => registration.unregister()),
            ...eccofoodCaches.map((name) => window.caches.delete(name)),
          ])

          if (hadStoredPwa && sessionStorage.getItem('eccofood-dev-pwa-reset') !== 'done') {
            sessionStorage.setItem('eccofood-dev-pwa-reset', 'done')
            window.location.reload()
          }
        } catch (error) {
          console.warn('Development PWA cleanup skipped:', error)
        }
      }

      void clearDevelopmentPwa()
      return
    }

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        console.log('Service Worker registered successfully:', registration)
        setSwRegistration(registration)

        // Check for updates periodically
        const interval = setInterval(() => {
          registration.update().catch((error) => {
            console.warn('Service Worker update skipped:', error)
          })
        }, 60000) // Check every minute

        return () => clearInterval(interval)
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })

    // Listen for controller change (new SW activated)
    const handleControllerChange = () => {
      console.log('Service Worker controller changed')
      toast.success('✓ Actualización instalada. Recarga para ver cambios.', {
        duration: 5000,
      })
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  // Monitor for waiting service worker (new version available)
  useEffect(() => {
    if (!swRegistration) return

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting)
        console.log('New Service Worker waiting to activate')
      }
    }

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
            toast.success('📦 Nueva versión disponible. Recargando...', {
              icon: '🔄',
              duration: 5000,
            })
            // Auto-update after a delay
            setTimeout(() => {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              setWaitingWorker(null)
            }, 1000)
          }
        })
      }
    })

    handleSWUpdate(swRegistration)
  }, [swRegistration])

  return null
}
