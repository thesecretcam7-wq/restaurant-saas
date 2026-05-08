import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import PlanComparison from './PlanComparison'

interface PageParams {
  params: Promise<{ domain: string }>
}

export const revalidate = 60

export default async function CambiarPlanPage({ params }: PageParams) {
  const { domain } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${domain}/login`)
  }

  // Get tenant by domain
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, subscription_plan, subscription_expires_at, trial_ends_at, status, created_at')
    .eq('slug', domain)
    .single()

  if (!tenant) {
    redirect(`/${domain}/login`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cambiar Plan</h1>
            <p className="text-gray-600 mt-1">Elige el plan que mejor se adapte a tus necesidades</p>
          </div>
          <Link href={`/${domain}/account/suscripcion`} className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
            ← Volver
          </Link>
        </div>

        <PlanComparison tenant={tenant} domain={domain} />
      </div>
    </div>
  )
}
