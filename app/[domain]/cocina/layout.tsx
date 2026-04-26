'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'

interface CocinaLayoutProps {
  children: ReactNode
}

export default function CocinaLayout({ children }: CocinaLayoutProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
