'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'
import TrialBanner from '@/components/admin/TrialBanner'
import { AdminMobileMenuTrigger } from '@/components/admin/AdminMobileMenuTrigger'

interface AdminContentProps {
  children: ReactNode
  trialEndsAt?: string | null
  slug: string
}

export function AdminContent({ children, trialEndsAt, slug }: AdminContentProps) {
  return (
    <ErrorBoundary>
      <AdminMobileMenuTrigger />
      <main className="admin-shell flex-1 h-screen min-h-0 w-full overflow-x-hidden overflow-y-auto pt-16 md:ml-64 md:w-[calc(100%-16rem)] md:pt-0">
        <div className="w-full min-w-0 p-3 sm:p-5 lg:p-7">
          {trialEndsAt && <TrialBanner trialEndsAt={trialEndsAt} slug={slug} />}
          {children}
        </div>
      </main>
    </ErrorBoundary>
  )
}
