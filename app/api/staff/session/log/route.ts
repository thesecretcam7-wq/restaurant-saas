import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantId, employee_name, role } = body

    if (!tenantId || !employee_name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create a session log entry (optional - for audit trail)
    // You can create a staff_sessions table if needed for logging
    console.log(`Staff session: ${employee_name} (${role}) logged in to tenant ${tenantId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Session log endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
