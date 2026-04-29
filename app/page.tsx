import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-orange-100">
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-orange-200 shadow-lg">
              <span className="text-white font-bold text-xl">e</span>
            </div>
            <span className="text-xl font-bold tracking-tight">Eccofood</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-orange-500 transition-colors">Funciones</a>
            <a href="#how" className="hover:text-orange-500 transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-orange-500 transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">Iniciar sesión</Link>
            <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-md shadow-orange-100 active:scale-95">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center relative">
          {/* Efecto de resplandor sutil de fondo */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-orange-200/30 blur-[120px] rounded-full -z-10" />

          <div className="inline-flex items-center bg-orange-50 border border-orange-100 px-3 py-1 rounded-full mb-8">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Plataforma de gestión premium para restaurantes</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]">
            Tu restaurante despega <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
              con Eccofood
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Gestiona tu menú, pedidos, reservas y pagos en un solo lugar.
            Diseño moderno, sin comisiones y completamente personalizable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register" className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-2">
              🚀 Crear mi restaurante
            </Link>
            <Link href="#" className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-600 px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:bg-slate-50 active:scale-[0.98]">
              Ver demostración
            </Link>
          </div>

          <p className="text-sm text-slate-400 mb-20 italic">
            30 días gratis · Sin tarjeta de crédito · Acceso completo
          </p>

          {/* --- DASHBOARD MOCKUP --- */}
          <div className="relative mx-auto max-w-5xl group">
            {/* Sombra de profundidad */}
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-[2.5rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>

            <div className="relative bg-white border border-slate-200 rounded-[2rem] shadow-2xl overflow-hidden">
              {/* Barra superior estilo Mac */}
              <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                  <div className="w-3 h-3 rounded-full bg-slate-200" />
                </div>
                <div className="mx-auto bg-slate-100 px-4 py-1 rounded-md text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                  eccofood.vercel.app/admin
                </div>
              </div>

              {/* Contenido del Dashboard */}
              <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Pedidos hoy', value: '48', trend: '+25%', color: 'text-orange-600' },
                  { label: 'Ingresos mes', value: '€8.5k', trend: '+15%', color: 'text-slate-900' },
                  { label: 'Reservas', value: '22', trend: '+5 pendientes', color: 'text-slate-900' },
                  { label: 'Clientes', value: '287', trend: '+12 nuevos', color: 'text-slate-900' },
                ].map((stat, i) => (
                  <div key={i} className="text-left p-4 rounded-xl hover:bg-slate-50 transition-colors">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color} mb-1`}>{stat.value}</p>
                    <p className="text-[10px] font-bold text-emerald-500 bg-emerald-50 inline-block px-2 py-0.5 rounded">
                      {stat.trend}
                    </p>
                  </div>
                ))}
              </div>

              {/* Espacio para gráfico o lista (visual) */}
              <div className="px-8 pb-8">
                <div className="w-full h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center">
                  <p className="text-slate-300 text-sm font-medium">Actividad reciente de pedidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- FEATURES --- */}
      <section id="features" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-600 text-sm font-semibold uppercase tracking-widest mb-4">Características</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Todo lo que necesitas</h2>
            <p className="text-slate-500 mt-4 text-lg">Herramientas poderosas para administrar tu restaurante</p>
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
              <div key={f.title} className="p-6 rounded-2xl border border-slate-200 hover:border-orange-200 hover:bg-orange-50/30 transition-all group">
                <div className="text-5xl mb-4">{f.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2 text-lg">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-600 text-sm font-semibold uppercase tracking-widest mb-3">Proceso</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Listo en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Registra tu restaurante', desc: 'Crea tu cuenta en 2 minutos. Sin tarjeta.' },
              { step: '02', title: 'Configura y personaliza', desc: 'Sube tu logo, elige colores, agrega menú.' },
              { step: '03', title: 'Comparte y vende', desc: 'Comparte tu link y recibe pedidos.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mx-auto mb-5">
                  <span className="text-orange-600 font-black text-xl">{s.step}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- PRICING --- */}
      <section id="pricing" className="py-24 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-600 text-sm font-semibold uppercase tracking-widest mb-4">Planes</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Precios para crecer</h2>
            <p className="text-slate-500 mt-4 text-lg">Sin comisiones por venta. Pagas solo lo que usas.</p>
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
                  ? 'bg-orange-50 border-orange-300 shadow-xl shadow-orange-100 scale-105'
                  : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                <div className="relative z-10">
                  {plan.highlight && (
                    <span className="inline-block px-3 py-1 rounded-full bg-orange-200 text-orange-700 text-xs font-bold mb-4">
                      ⭐ Más elegido
                    </span>
                  )}
                  <p className="font-bold text-slate-600 text-sm mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 text-sm mb-2">{plan.period}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-6">{plan.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register"
                    className={`block w-full py-3 rounded-lg text-sm font-bold text-center transition-all active:scale-95 ${plan.highlight
                      ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA FINAL --- */}
      <section className="py-24 px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            Tu restaurante merece<br />
            <span className="text-orange-600">una plataforma excepcional</span>
          </h2>
          <p className="text-slate-500 text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Simplifica operaciones y amplifica ventas. Sin comisiones, sin sorpresas.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg transition-all shadow-lg shadow-orange-200 active:scale-95">
            🚀 Crear mi restaurante gratis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-100 py-12 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-sm font-black text-white">e</div>
                <span className="font-bold text-slate-900 text-lg">Eccofood</span>
              </div>
              <p className="text-sm text-slate-500">Plataforma premium para restaurantes modernos.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-3 text-sm">Producto</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#features" className="hover:text-slate-900 transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-slate-900 transition-colors">Precios</a></li>
                <li><a href="#how" className="hover:text-slate-900 transition-colors">Cómo funciona</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-3 text-sm">Empresa</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="mailto:soporte@eccofood.com" className="hover:text-slate-900 transition-colors">Soporte</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Blog</a></li>
                <li><Link href="/login" className="hover:text-slate-900 transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-3 text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© 2026 Eccofood. Hecho con ❤️ para restaurantes.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
