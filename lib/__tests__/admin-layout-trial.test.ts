import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminLayout from '@/app/[domain]/admin/layout'
import { AdminContent } from '@/app/[domain]/admin/AdminContent'

const mocks = vi.hoisted(() => ({
  tenant: { id: 'tenant', slug: 'cafe', organization_name: 'Cafe', status: 'active', subscription_plan: 'premium', trial_ends_at: '2026-01-01T00:00:00Z' },
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  from: () => ({ select() { return this }, retry() { return this }, abortSignal() { return this }, eq() { return this }, single: async () => ({ data: mocks.tenant, error: null }) }),
}) }))
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: JSON.stringify({ tenantId: 'tenant', role: 'admin', permissions: ['admin_dashboard'] }) }) }) }))
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`) } }))
vi.mock('@/lib/supabase/network', () => ({ getVerifiedUser: async () => null, isAuthConnectionError: () => false }))
vi.mock('@/lib/tenant', () => ({ getTenantContext: async () => ({ branding: {}, tenant: {} }) }))
vi.mock('@/components/admin/AdminSidebar', () => ({ AdminSidebar: () => null }))
vi.mock('@/app/[domain]/admin/AdminContent', () => ({ AdminContent: () => null }))
vi.mock('@/components/admin/SectionColorProvider', () => ({ SectionColorProvider: () => null }))

function contentProps(node: unknown): Record<string, unknown> | undefined {
  if (!React.isValidElement<Record<string, unknown>>(node)) return undefined
  if (node.type === AdminContent) return node.props
  for (const child of React.Children.toArray(node.props.children as React.ReactNode)) {
    const found = contentProps(child)
    if (found) return found
  }
}

beforeEach(() => {
  vi.stubGlobal('React', React)
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-27T12:00:00Z'))
  mocks.tenant.status = 'active'
  mocks.tenant.subscription_plan = 'premium'
  mocks.tenant.trial_ends_at = '2026-01-01T00:00:00Z'
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('admin trial banner', () => {
  it('does not show an expired historical trial for an active premium subscription', async () => {
    const tree = await AdminLayout({ params: Promise.resolve({ domain: 'cafe' }), children: null })
    expect(contentProps(tree)?.trialEndsAt).toBeNull()
  })

  it.each(['2026-11-01T00:00:00Z', '2026-01-01T00:00:00Z'])('keeps the trial notice for actual trial accounts (%s)', async end => {
    mocks.tenant.status = 'trial'
    mocks.tenant.subscription_plan = 'trial'
    mocks.tenant.trial_ends_at = end
    const tree = await AdminLayout({ params: Promise.resolve({ domain: 'cafe' }), children: null })
    expect(contentProps(tree)?.trialEndsAt).toBe(new Date(end).toISOString())
  })
})
