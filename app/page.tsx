import Link from 'next/link'

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white font-sans selection:bg-orange-400/30 relative overflow-hidden"
      data-theme="landing"
      style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1F2937 50%, #0F172A 100%)',
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      {/* Gradiente de fondo decorativo */}
      <div
        className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ background: `radial-gradient(circle, var(--color-secondary), transparent)` }}
      />
      <div
        className="absolute top-1/3 -left-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15"
        style={{ background: `radial-gradient(circle, var(--color-primary), transparent)` }}
      />
      <div
        className="absolute -bottom-20 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ background: `radial-gradient(circle, var(--color-danger), transparent)` }}
      />

      {/* --- NAVBAR --- */}
      <nav
        className="fixed top-0 w-full z-50 backdrop-blur-md border-b"
        style={{
          background: 'rgba(15, 23, 42, 0.8)',
          borderColor: 'var(--color-primary)',
          borderBottomWidth: '1px',
          opacity: 0.9,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                boxShadow: '0 0 16px var(--color-primary)',
              }}
            >
              <span className="text-white font-bold text-xl">e</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Eccofood</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-orange-400 transition-colors">Funciones</a>
            <a href="#how" className="hover:text-orange-400 transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-orange-400 transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Iniciar sesión</Link>
            <Link
              href="/register"
              className="text-white px-5 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                boxShadow: '0 8px 20px var(--color-primary)',
              }}
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center relative">
          <div
            className="inline-flex items-center border px-3 py-1 rounded-full mb-8"
            style={{
              backgroundColor: 'var(--color-secondary)',
              borderColor: 'var(--color-secondary)',
              opacity: 0.3,
            }}
          >
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-secondary)' }}
            >
              Plataforma de gestión premium para restaurantes
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Tu restaurante despega <br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                background: 'linear-gradient(90deg, var(--color-secondary), var(--color-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              con Eccofood
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Gestiona tu menú, pedidos, reservas y pagos en un solo lugar.
            Diseño moderno, sin comisiones y completamente personalizable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                boxShadow: '0 16px 32px var(--color-primary)',
              }}
            >
              🚀 Crear mi restaurante
            </Link>
            <Link
              href="#"
              className="w-full sm:w-auto text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(55, 65, 81, 0.6)',
                border: '2px solid',
                borderColor: 'var(--color-secondary)',
              }}
            >
              Ver demostración
            </Link>
          </div>

          <p className="text-sm text-slate-400 mb-20 italic">
            30 días gratis · Sin tarjeta de crédito · Acceso completo
          </p>

          {/* --- DASHBOARD MOCKUP --- */}
          <div className="relative mx-auto max-w-5xl group">
            {/* Sombra de profundidad */}
            <div
              className="absolute -inset-1 rounded-[2.5rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"
              style={{
                background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
              }}
            ></div>

            <div
              className="relative rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-sm"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(31, 41, 55, 0.9))',
                border: '1px solid',
                borderColor: 'var(--color-primary)',
              }}
            >
              {/* Barra superior estilo Mac */}
              <div
                className="border-b px-6 py-3 flex items-center gap-2"
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderBottomColor: 'var(--color-primary)',
                }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="mx-auto bg-slate-800/60 px-4 py-1 rounded-md text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  eccofood.vercel.app/admin
                </div>
              </div>

              {/* Contenido del Dashboard */}
              <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Pedidos hoy', value: '48', trend: '+25%', color: 'var(--color-secondary)', bgOpacity: 0.1 },
                  { label: 'Ingresos mes', value: '€8.5k', trend: '+15%', color: 'white', bgOpacity: 0.04 },
                  { label: 'Reservas', value: '22', trend: '+5 pendientes', color: 'white', bgOpacity: 0.04 },
                  { label: 'Clientes', value: '287', trend: '+12 nuevos', color: 'white', bgOpacity: 0.04 },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="text-left p-4 rounded-xl border transition-colors"
                    style={{
                      backgroundColor: i === 0 ? `var(--color-secondary)` : 'rgba(100, 116, 139, 0.15)',
                      opacity: 1,
                      borderColor: i === 0 ? 'var(--color-secondary)' : 'rgba(100, 116, 139, 0.3)',
                    }}
                  >
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold mb-1" style={{ color: stat.color }}>
                      {stat.value}
                    </p>
                    <p
                      className="text-[10px] font-bold inline-block px-2 py-0.5 rounded border"
                      style={{
                        color: 'var(--color-success)',
                        backgroundColor: 'var(--color-success)',
                        borderColor: 'var(--color-success)',
                        opacity: 0.5,
                      }}
                    >
                      {stat.trend}
                    </p>
                  </div>
                ))}
              </div>

              {/* Espacio para gráfico o lista (visual) */}
              <div className="px-8 pb-8">
                <div className="w-full h-32 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700/50 flex items-center justify-center">
                  <p className="text-slate-500 text-sm font-medium">Actividad reciente de pedidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- FEATURES --- */}
      <section id="features" className="py-24 px-6 bg-slate-950/50 border-t border-orange-500/20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-4">Características</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">Todo lo que necesitas</h2>
            <p className="text-slate-300 mt-4 text-lg">Herramientas poderosas para administrar tu restaurante</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🛍️', title: 'Menú Digital', desc: 'Catálogo profesional con fotos, descripciones y precios.' },
              { icon: '📦', title: 'Gestión de Pedidos', desc: 'Control en tiempo real de todas tus órdenes.' },
              { icon: '💳', title: 'Pagos Seguros', desc: 'Integración Stripe para cobros automáticos.' },
              { icon: '📅', title: 'Reservas', desc: 'Sistema completo de reservaciones y mesas.' },
              { icon: '📊', title: 'Analytics', desc: 'Reportes y datos sobre tu negocio.' },
              { icon: '🎨', title: 'Personalización', desc: 'Tu marca en cada interacción del cliente.' },
            ].map((f, i) => (
              <div key={f.title} className="p-6 rounded-2xl border border-slate-700/50 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all group bg-slate-900/50">
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-white mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how" className="py-24 px-6 relative z-10 border-t border-orange-500/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">Proceso</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">Listo en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Registra tu restaurante', desc: 'Crea tu cuenta en 2 minutos. Sin tarjeta.' },
              { step: '02', title: 'Configura y personaliza', desc: 'Sube tu logo, elige colores, agrega menú.' },
              { step: '03', title: 'Comparte y vende', desc: 'Comparte tu link y recibe pedidos.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center mx-auto mb-5">
                  <span className="text-orange-400 font-black text-xl">{s.step}</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 px-6 bg-slate-950/50 border-t border-orange-500/20 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-4">Planes</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">Precios para crecer</h2>
            <p className="text-slate-300 mt-4 text-lg">Sin comisiones por venta. Pagas solo lo que usas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Essentials',
                price: '€39',
                period: '/mes',
                desc: 'Perfecto para comenzar',
                features: ['Menú digital', 'Gestión de pedidos', 'Hasta 500 pedidos/mes', '1 usuario', 'Soporte email'],
                cta: 'Empezar gratis',
                highlight: false,
              },
              {
                name: 'Professional',
                price: '€99',
                period: '/mes',
                desc: 'Más opciones, sin límites',
                features: ['Todo de Essentials', 'Pedidos ilimitados', 'Sistema de reservas', 'Delivery integrado', 'Analytics avanzado', 'Hasta 3 usuarios', 'Soporte prioritario'],
                cta: 'Empezar gratis',
                highlight: true,
              },
              {
                name: 'Enterprise',
                price: 'Custom',
                period: 'según necesidad',
                desc: 'Para cadenas y franquicias',
                features: ['Todo de Professional', 'Múltiples ubicaciones', 'API personalizada', 'Integración personalizada', 'Soporte 24/7 dedicado', 'Onboarding VIP'],
                cta: 'Solicitar demo',
                highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name}
                className={`rounded-2xl p-8 border transition-all relative overflow-hidden group ${plan.highlight
                  ? 'bg-gradient-to-br from-orange-500/20 to-red-500/10 border-orange-500/50 shadow-xl shadow-orange-500/30 scale-105'
                  : 'bg-slate-900/50 border-slate-700/50 hover:border-orange-500/30'}`}>
                <div className="relative z-10">
                  {plan.highlight && (
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-500/30 text-orange-300 text-xs font-bold mb-4 border border-orange-500/50">
                      ⭐ Más elegido
                    </span>
                  )}
                  <p className="font-bold text-slate-300 text-sm mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm mb-2">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-6">{plan.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register"
                    className={`block w-full py-3 rounded-lg text-sm font-bold text-center transition-all active:scale-95 ${plan.highlight
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/50'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700/50'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 px-6 border-t border-orange-500/20 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-white">
            Tu restaurante merece<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-red-500">una plataforma excepcional</span>
          </h2>
          <p className="text-slate-300 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Simplifica operaciones y amplifica ventas. Sin comisiones, sin sorpresas.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-lg transition-all shadow-lg shadow-orange-500/50 active:scale-95">
            🚀 Crear mi restaurante gratis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-orange-500/20 py-12 px-6 bg-slate-950 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-sm font-black text-white">e</div>
                <span className="font-bold text-white text-lg">Eccofood</span>
              </div>
              <p className="text-sm text-slate-400">Plataforma premium para restaurantes modernos.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Producto</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-orange-400 transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-orange-400 transition-colors">Precios</a></li>
                <li><a href="#how" className="hover:text-orange-400 transition-colors">Cómo funciona</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Empresa</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="mailto:soporte@eccofood.com" className="hover:text-orange-400 transition-colors">Soporte</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Blog</a></li>
                <li><Link href="/login" className="hover:text-orange-400 transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white mb-3 text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-orange-400 transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">© 2026 Eccofood. Hecho con ❤️ para restaurantes.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
