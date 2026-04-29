import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AccountsContent from './AccountsContent'

export const dynamic = 'force-dynamic'

export default async function AccountsPage() {
  const supabase = createServiceClient()

  // Check if user is authenticated (this should be a super-admin check in production)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get all accounts
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, organization_name, owner_name, owner_email, status, subscription_plan, trial_ends_at, created_at, stripe_account_status')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching accounts:', error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Cuentas</h1>
            <p className="text-gray-600 mt-1">Administra todas las cuentas de clientes</p>
          </div>
          <Link href="/" className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
            ← Volver
          </Link>
        </div>

        <AccountsContent initialTenants={tenants || []} />
      </div>
    </div>
  )
}
