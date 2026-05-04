import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 -right-32 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Navbar */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white">E</div>
            <span className="font-bold text-foreground text-lg tracking-tight">Eccofood</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold">Administración</span>
          </div>
          <h1 className="text-4xl font-black text-foreground mb-2">Panel de Administración</h1>
          <p className="text-muted-foreground text-lg">Gestiona todas las cuentas de clientes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cuentas Card */}
          <Link href="/admin/cuentas" className="group animate-slide-up" style={{ animationDelay: '0ms' }}>
            <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-8 hover:border-primary/40 hover:bg-primary/5 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">👥</span>
              </div>
              <h2 className="text-xl font-black text-foreground mb-2">Gestionar Cuentas</h2>
              <p className="text-muted-foreground text-sm mb-4">Ve todas las cuentas de clientes, busca, filtra y desbloquea cuentas expiradas</p>
              <div className="inline-flex items-center text-primary font-semibold group-hover:translate-x-2 transition-transform text-sm">
                Ir al panel
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Ingresos Card */}
          <Link href="/admin/ingresos" className="group animate-slide-up" style={{ animationDelay: '50ms' }}>
            <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-8 hover:border-secondary/40 hover:bg-secondary/5 transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h2 className="text-xl font-black text-foreground mb-2">Dashboard de Ingresos</h2>
              <p className="text-muted-foreground text-sm mb-4">Visualiza ingresos totales, suscripciones activas, tasa de churn y tendencias</p>
              <div className="inline-flex items-center text-secondary font-semibold group-hover:translate-x-2 transition-transform text-sm">
                Ir al panel
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Info Card */}
          <div className="rounded-2xl border-2 border-border bg-card/50 backdrop-blur-sm p-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <span className="text-2xl">ℹ️</span>
            </div>
            <h2 className="text-xl font-black text-foreground mb-2">Información</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Panel de administración de Eccofood. Gestiona todas las cuentas de tus clientes.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Ver todas las cuentas creadas
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Filtrar por estado
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Desbloquear cuentas expiradas
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Ver ingresos y suscripciones
              </li>
            </ul>
          </div>
        </div>

        {/* System Info */}
        <div className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-8 animate-slide-up" style={{ animationDelay: '150ms' }}>
          <h3 className="text-xl font-black text-foreground mb-4">Sistema de Prueba</h3>
          <p className="text-muted-foreground mb-4">
            Todos los clientes nuevos reciben 30 días de prueba gratuita. Cuando la prueba expira, tienen dos opciones:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <p className="font-bold text-foreground mb-2">1. Extender Prueba</p>
              <p className="text-sm text-muted-foreground">Agrega más días al período de prueba (ej: 30 días adicionales)</p>
            </div>
            <div className="rounded-xl border border-border bg-card/50 p-4">
              <p className="font-bold text-foreground mb-2">2. Activar Suscripción</p>
              <p className="text-sm text-muted-foreground">Marca como pagado cuando reciben un pago manual</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
