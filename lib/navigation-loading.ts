'use client'

import { useEffect, useSyncExternalStore } from 'react'

// All route boundaries and page data loaders share one visual indicator.
const pending = new Set<symbol>()
const subscribers = new Set<() => void>()
let navigating = false
let navigationTimeout: ReturnType<typeof setTimeout> | undefined
const emit = () => subscribers.forEach(listener => listener())
export const getNavigationLoadingSnapshot = () => navigating || pending.size > 0
const subscribe = (listener: () => void) => {
  subscribers.add(listener)
  return () => { subscribers.delete(listener) }
}

export function beginNavigationLoading() {
  navigating = true
  clearTimeout(navigationTimeout)
  navigationTimeout = setTimeout(finishNavigationLoading, 12000)
  emit()
}

export function finishNavigationLoading() {
  navigating = false
  clearTimeout(navigationTimeout)
  emit()
}

export function retainPageLoading() {
  const token = Symbol('page-loading')
  pending.add(token)
  emit()
  return () => { pending.delete(token); emit() }
}

export function usePageLoading(loading: boolean) {
  useEffect(() => loading ? retainPageLoading() : undefined, [loading])
}

export function useNavigationLoading() {
  return useSyncExternalStore(subscribe, getNavigationLoadingSnapshot, () => false)
}
