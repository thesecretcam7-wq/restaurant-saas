import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AccountsContent from './AccountsContent'

export const revalidate = 60

export default async function GestionarCuentasPage() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  if (!hasSupabaseConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-2xl rounded-3xl border border-orange-400/20 bg-white/10 p-8 shadow-2xl shadow-black/30 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-300">Configuracion pendiente</p>
          <h1 className="mt-4 text-3xl font-black">Faltan variables de Supabase</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
            Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Vercel para activar la gestion de cuentas.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only allow the owners
  const ownerEmails = ['thesecretcam7@gmail.com', 'johang.musica@gmail.com']
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  // Get all accounts
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, organization_name, owner_name, owner_email, status, subscription_plan, trial_ends_at, subscription_expires_at, created_at, stripe_account_status')
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
          <Link href="/owner-dashboard" className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
            ← Volver
          </Link>
        </div>

        <AccountsContent initialTenants={tenants || []} />
      </div>
    </div>
  )
}
