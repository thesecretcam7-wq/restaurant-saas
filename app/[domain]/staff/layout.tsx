'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'

interface StaffLayoutProps {
  children: ReactNode
}

export default function StaffLayout({ children }: StaffLayoutProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
