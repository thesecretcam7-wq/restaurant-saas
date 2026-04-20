import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export interface VerifyTenantOwnershipResult {
  userId: string
  tenantId: string
  plan: string
}

/**
 * Verifies that the authenticated user owns the given tenant (by slug/domain).
 * Used for admin operations that require ownership verification.
 *
 * @param request - NextRequest with Authorization header containing JWT
 * @param slugOrDomain - Tenant slug or domain (e.g., 'elbuenpaladar')
 * @returns Promise<VerifyTenantOwnershipResult> - User ID, Tenant ID, and plan
 * @throws Error if authentication fails or user doesn't own tenant
 */
export async function verifyTenantOwnership(
  request: NextRequest,
  slugOrDomain: string
): Promise<VerifyTenantOwnershipResult> {
  // Get Authorization header
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid Authorization header')
  }

  const token = authHeader.substring(7)

  // Verify JWT and get user
  const supabaseAdmin = createServiceClient()
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !userData.user) {
    throw new Error('Unauthorized: Invalid or expired token')
  }

  // Get tenant by slug/domain
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('id, owner_id, subscription_plan')
    .eq('slug', slugOrDomain)
    .single()

  if (tenantError || !tenant) {
    throw new Error('Tenant not found')
  }

  // Verify ownership
  if (tenant.owner_id !== userData.user.id) {
    throw new Error('Forbidden: You do not own this tenant')
  }

  return {
    userId: userData.user.id,
    tenantId: tenant.id,
    plan: tenant.subscription_plan || 'free',
  }
}

/**
 * Helper to send a standardized error response
 */
export function sendErrorResponse(error: unknown, status = 500): NextResponse {
  const message = error instanceof Error ? error.message : 'Internal server error'

  // Log critical security errors
  if (message.includes('Unauthorized') || message.includes('Forbidden')) {
    console.warn('[Security] Authentication/Authorization error:', message)
  }

  return NextResponse.json({ error: message }, { status })
}
