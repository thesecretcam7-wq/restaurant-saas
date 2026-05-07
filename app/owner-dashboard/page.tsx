import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OwnerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ownerEmails = ['thesecretcam7@gmail.com']
  if (!user || !user.email || !ownerEmails.includes(user.email)) {
    redirect('/login')
  }

  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, organization_name, owner_email, status, trial_ends_at, created_at, slug')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 -right-32 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white">E</div>
            <span className="font-bold text-foreground text-lg tracking-tight">Eccofood</span>
          </Link>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Bienvenido</p>
            <p className="text-sm font-semibold text-foreground">{user.email}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold">Super Admin</span>
          </div>
          <h1 className="text-4xl font-black text-foreground mb-2">Panel de Propietario</h1>
          <p className="text-muted-foreground">Gestiona todas las cuentas de Eccofood</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Cuentas Card */}
          <Link href="/gestionar-cuentas" className="group animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-6 hover:border-primary/40 hover:bg-primary/5 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h2 className="text-lg font-black text-foreground mb-1">Gestionar Cuentas</h2>
              <p className="text-sm text-muted-foreground mb-4">Ver y desbloquear cuentas</p>
              <div className="inline-flex items-center text-primary font-semibold group-hover:translate-x-1 transition-transform text-sm">
                Ir
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Ingresos Card */}
          <Link href="/admin/ingresos" className="group animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-6 hover:border-secondary/40 hover:bg-secondary/5 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-lg font-black text-foreground mb-1">Dashboard de Ingresos</h2>
              <p className="text-sm text-muted-foreground mb-4">Analiza ingresos y subscripciones</p>
              <div className="inline-flex items-center text-secondary font-semibold group-hover:translate-x-1 transition-transform text-sm">
                Ir
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Stats */}
          <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h2 className="text-lg font-black text-foreground mb-1">Total de Cuentas</h2>
            <p className="text-4xl font-black text-primary mt-2">{tenants?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-2">Restaurantes activos</p>
          </div>

          {/* Info */}
          <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-lg font-black text-foreground mb-1">Trial Gratis</h2>
            <p className="text-sm text-muted-foreground">30 días de acceso</p>
            <p className="text-xs text-muted-foreground mt-2">Por cuenta nueva</p>
          </div>
        </div>

        {/* Recent Accounts */}
        {tenants && tenants.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-black text-foreground">Cuentas Recientes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Restaurante</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Creado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-semibold text-foreground">{tenant.organization_name}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{tenant.owner_email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          tenant.status === 'trial'
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : tenant.status === 'active'
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(tenant.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <a
                          href={`https://${tenant.slug}.eccofoodapp.com/admin`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-primary to-secondary text-white rounded-lg transition-all text-xs font-semibold shadow-sm hover:shadow-md hover:shadow-primary/20 active:scale-95"
                        >
                          Entrar
                          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-border text-center">
              <Link href="/gestionar-cuentas" className="text-primary font-semibold hover:text-primary/80 text-sm transition-colors">
                Ver todas las cuentas →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
