import Link from 'next/link'
import { redirect } from 'next/navigation'
import EccofoodLogo from '@/components/EccofoodLogo'
import { isOwnerEmail } from '@/lib/owner-auth'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import SupportInbox, { SupportRequest } from './SupportInbox'

export const dynamic = 'force-dynamic'

export default async function OwnerSupportPage() {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!isOwnerEmail(user?.email)) {
    redirect('/owner-login')
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('owner_support_requests')
    .select(`
      id,
      tenant_id,
      restaurant_name,
      contact_name,
      contact_email,
      contact_phone,
      subject,
      message,
      status,
      priority,
      owner_notes,
      created_at,
      tenants (
        organization_name,
        slug,
        subscription_plan,
        status
      )
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const tableReady = !error

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <EccofoodLogo size="sm" textClassName="font-bold text-foreground text-lg tracking-tight" />
          </Link>
          <Link
            href="/owner-dashboard"
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 text-sm font-medium transition-all"
          >
            Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-foreground">Centro de soporte</h1>
          <p className="text-muted-foreground mt-2">Lee preguntas de clientes, cambia estados y guarda notas internas.</p>
        </div>

        <SupportInbox
          initialRequests={(data || []).map(request => ({
            ...request,
            tenants: Array.isArray(request.tenants) ? request.tenants[0] || null : request.tenants,
          })) as SupportRequest[]}
          tableReady={tableReady}
        />
      </div>
    </div>
  )
}
