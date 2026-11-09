'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { createPortal } from 'react-dom'
import EccofoodPageLoader from '@/components/EccofoodPageLoader'
import { beginNavigationLoading, finishNavigationLoading, useNavigationLoading } from '@/lib/navigation-loading'
import { getOverlayTarget } from '@/lib/overlay-target'

export default function GlobalNavigationLoader() {
  const pathname = usePathname()
  const search = useSearchParams().toString()
  const pending = useNavigationLoading()
  const [visible, setVisible] = useState(false)

  useEffect(() => { finishNavigationLoading() }, [pathname, search])
  useEffect(() => {
    // Fast transitions need no flash. A short handoff avoids route/data flicker.
    const timer = setTimeout(() => setVisible(pending), pending ? 180 : 120)
    return () => clearTimeout(timer)
  }, [pending])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, location.href)
      if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return
      if (url.pathname === location.pathname && url.search === location.search) return
      beginNavigationLoading()
    }
    function onSubmit(event: SubmitEvent) {
      const form = event.target
      if (event.defaultPrevented || !(form instanceof HTMLFormElement) || form.method.toLowerCase() !== 'get') return
      if (new URL(form.action, location.href).origin === location.origin) beginNavigationLoading()
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('submit', onSubmit)
    window.addEventListener('eccofood:navigation-start', beginNavigationLoading)
    window.addEventListener('store:navigation-start', beginNavigationLoading)
    window.addEventListener('popstate', finishNavigationLoading)
    window.addEventListener('pageshow', finishNavigationLoading)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('submit', onSubmit)
      window.removeEventListener('eccofood:navigation-start', beginNavigationLoading)
      window.removeEventListener('store:navigation-start', beginNavigationLoading)
      window.removeEventListener('popstate', finishNavigationLoading)
      window.removeEventListener('pageshow', finishNavigationLoading)
      finishNavigationLoading()
    }
  }, [])

  const target = getOverlayTarget()
  if (!visible || !target) return null
  return createPortal(
    <div role="status" aria-live="polite" aria-label="Cargando Eccofood" data-navigation-loader
      className="pointer-events-none fixed left-1/2 top-1/2 z-[10000] w-full max-w-[380px] -translate-x-1/2 -translate-y-1/2">
      <EccofoodPageLoader label="Cargando Eccofood" detail="Un momento, por favor." mode="card" />
    </div>, target,
  )
}
