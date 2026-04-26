'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'

interface AdminContentProps {
  children: ReactNode
}

export function AdminContent({ children }: AdminContentProps) {
  return (
    <ErrorBoundary>
      <main className="md:ml-64 flex-1 p-0 min-h-screen max-h-screen overflow-y-auto w-full pt-14 md:pt-0">
        {children}
      </main>
    </ErrorBoundary>
  )
}
