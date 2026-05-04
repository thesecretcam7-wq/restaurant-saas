'use client'

import { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/admin/ErrorBoundary'
import TrialBanner from '@/components/admin/TrialBanner'

interface AdminContentProps {
  children: ReactNode
  trialEndsAt?: string | null
  slug: string
}

export function AdminContent({ children, trialEndsAt, slug }: AdminContentProps) {
  return (
    <ErrorBoundary>
      <main className="admin-shell md:ml-64 flex-1 min-h-screen max-h-screen overflow-y-auto w-full pt-14 md:pt-0">
        <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {trialEndsAt && <TrialBanner trialEndsAt={trialEndsAt} slug={slug} />}
          {children}
        </div>
      </main>
    </ErrorBoundary>
  )
}
