'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'

interface StaffLayoutProps {
  children: ReactNode
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  return (
    <div className="ecco-premium-app min-h-screen relative overflow-hidden">
      <div className="relative z-10">
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  )
}
