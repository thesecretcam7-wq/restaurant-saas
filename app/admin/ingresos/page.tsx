import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RevenueContent from './RevenueContent'

export const revalidate = 60

const ownerEmails = ['thesecretcam7@gmail.com']

export default async function IngresosDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Only allow owners
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Dashboard de Ingresos</h1>
            <p className="text-gray-600 mt-2">Monitorea el desempeño de tu negocio y subscripciones</p>
          </div>
          <Link href="/owner-dashboard" className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors">
            ← Volver
          </Link>
        </div>

        <RevenueContent />
      </div>
    </div>
  )
}
