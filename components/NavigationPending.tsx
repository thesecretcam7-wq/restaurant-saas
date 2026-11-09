'use client'

import { usePageLoading } from '@/lib/navigation-loading'

export default function NavigationPending() {
  usePageLoading(true)
  return null
}
