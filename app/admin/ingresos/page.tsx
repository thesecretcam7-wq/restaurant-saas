import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import RevenueContent from './RevenueContent'
import EccofoodLogo from '@/components/EccofoodLogo'
import { isOwnerEmail } from '@/lib/owner-auth'

export const dynamic = 'force-dynamic'

export default async function IngresosDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!isOwnerEmail(user?.email)) {
    redirect('/owner-login')
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 -right-32 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <EccofoodLogo size="sm" textClassName="font-bold text-foreground text-lg tracking-tight" />
          </Link>
          <Link
            href="/owner-dashboard"
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 text-sm font-medium transition-all"
          >
            ← Volver
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-black text-foreground">Dashboard de Ingresos</h1>
          <p className="text-muted-foreground mt-2">Monitorea el desempeño de tu negocio y subscripciones</p>
        </div>

        <RevenueContent />
      </div>
    </div>
  )
}
