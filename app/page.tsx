import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-sm font-black">R</div>
            <span className="font-bold text-white text-lg tracking-tight">RestaurantOS</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Funciones</a>
            <a href="#how" className="hover:text-white transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-white transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Plataforma todo-en-uno para restaurantes
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            Tu restaurante,
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
              en línea en minutos
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crea tu tienda online, gestiona pedidos, reservas y pagos. Todo con tu marca, tu dominio y sin comisiones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-base transition-all shadow-lg shadow-orange-500/25 active:scale-95">
              Crear mi restaurante gratis
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-semibold text-base transition-all">
              Ya tengo cuenta →
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras</p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="rounded-2xl border border-white/10 bg-[#111111] overflow-hidden shadow-2xl shadow-black/50">
            {/* Fake browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/5 bg-[#0D0D0D]">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center px-3">
                <span className="text-xs text-gray-500">restaurant-saas-inky.vercel.app/mi-pizzeria/admin</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Pedidos hoy', value: '34', change: '+12%', color: 'text-green-400' },
                { label: 'Ingresos mes', value: '$4.2M', change: '+8%', color: 'text-green-400' },
                { label: 'Reservas', value: '18', change: '3 pendientes', color: 'text-orange-400' },
                { label: 'Clientes', value: '312', change: '+5 nuevos', color: 'text-blue-400' },
              ].map(card => (
                <div key={card.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-white">{card.value}</p>
                  <p className={`text-xs font-medium mt-1 ${card.color}`}>{card.change}</p>
                </div>
              ))}
              <div className="col-span-4 bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-gray-500 mb-3">Pedidos recientes</p>
                <div className="space-y-2">
                  {[
                    { num: '#0234', item: 'Pizza Margherita × 2', status: 'Preparando', color: 'bg-orange-500/20 text-orange-400' },
                    { num: '#0233', item: 'Hamburguesa Clásica × 1', status: 'En camino', color: 'bg-blue-500/20 text-blue-400' },
                    { num: '#0232', item: 'Lasaña + Ensalada', status: 'Entregado', color: 'bg-green-500/20 text-green-400' },
                  ].map(o => (
                    <div key={o.num} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 font-mono text-xs">{o.num}</span>
                      <span className="text-gray-300 flex-1 mx-4 truncate">{o.item}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${o.color}`}>{o.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-12 px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest font-semibold mb-8">
            Restaurantes que ya venden en línea
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-40">
            {['Pizzería Napoli', 'Burger Factory', 'Sushi Palace', 'La Parrilla', 'Tacos & Co', 'El Fogón'].map(name => (
              <span key={name} className="text-sm font-bold text-white tracking-wide">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">Funciones</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Todo lo que necesitas,<br />nada que no necesitas</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: '🛍️',
                title: 'Tienda Online',
                desc: 'Menú digital con fotos, carrito de compras y checkout. Tus clientes ordenan desde el móvil en segundos.',
                tag: 'Core',
              },
              {
                icon: '📦',
                title: 'Gestión de Pedidos',
                desc: 'Panel en tiempo real. Acepta, prepara y marca pedidos como entregados con un clic.',
                tag: 'Core',
              },
              {
                icon: '📅',
                title: 'Reservas',
                desc: 'Sistema completo de reservas con confirmación automática y gestión de mesas.',
                tag: 'Core',
              },
              {
                icon: '💳',
                title: 'Pagos Stripe',
                desc: 'Recibe pagos con tarjeta directamente en tu cuenta Stripe. Sin intermediarios.',
                tag: 'Pagos',
              },
              {
                icon: '🎨',
                title: 'Tu Marca',
                desc: 'Logo, colores, tipografía. Tu tienda se ve como tú quieres, no como nosotros queremos.',
                tag: 'Branding',
              },
              {
                icon: '🌐',
                title: 'Dominio Propio',
                desc: 'Conecta pizzeriaroma.com en 2 minutos. Instrucciones paso a paso incluidas.',
                tag: 'Avanzado',
              },
              {
                icon: '🚗',
                title: 'Delivery',
                desc: 'Activa entregas a domicilio con tarifa configurable, zona de cobertura y tiempo estimado.',
                tag: 'Logística',
              },
              {
                icon: '📊',
                title: 'Analytics',
                desc: 'Ingresos, pedidos, productos más vendidos. Todos los datos que necesitas para crecer.',
                tag: 'Análisis',
              },
              {
                icon: '📱',
                title: 'PWA Nativa',
                desc: 'Tus clientes instalan tu app directamente desde el navegador. Sin App Store.',
                tag: 'Móvil',
              },
            ].map(f => (
              <div key={f.title} className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-white">{f.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-medium">{f.tag}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">Proceso</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Listo en 3 pasos</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16.66%] right-[16.66%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {[
              { step: '01', title: 'Registra tu restaurante', desc: 'Crea tu cuenta en 2 minutos con el nombre y tu email. Sin tarjeta.' },
              { step: '02', title: 'Configura y personaliza', desc: 'Sube tu logo, elige colores, agrega tu menú con fotos y precios.' },
              { step: '03', title: 'Comparte y vende', desc: 'Comparte tu link y empieza a recibir pedidos y reservas de inmediato.' },
            ].map(s => (
              <div key={s.step} className="text-center relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-orange-400 font-black text-xl">{s.step}</span>
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-orange-400 text-sm font-semibold uppercase tracking-widest mb-3">Precios</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Simple y transparente</h2>
            <p className="text-gray-400 mt-4">Sin comisiones por venta. Pagas solo por el plan.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                name: 'Básico',
                price: '€29',
                period: '/mes',
                desc: 'Para restaurantes que empiezan',
                features: ['Menú digital', 'Pedidos online', 'Hasta 100 pedidos/mes', 'Soporte por email'],
                cta: 'Empezar',
                highlight: false,
              },
              {
                name: 'Pro',
                price: '€79',
                period: '/mes',
                desc: 'El más popular',
                features: ['Todo lo de Básico', 'Pedidos ilimitados', 'Reservas', 'Delivery', 'Analytics', 'Dominio propio', 'Sistema mesero/cocina'],
                cta: 'Empezar gratis',
                highlight: true,
              },
              {
                name: 'Premium',
                price: '€199',
                period: '/mes',
                desc: 'Para cadenas y franquicias',
                features: ['Todo lo de Pro', 'Múltiples sucursales', 'API acceso', 'Soporte prioritario 24/7', 'Onboarding personalizado'],
                cta: 'Contactar',
                highlight: false,
              },
            ].map(plan => (
              <div key={plan.name}
                className={`rounded-2xl p-6 border relative ${plan.highlight
                  ? 'bg-orange-500/10 border-orange-500/50'
                  : 'bg-white/[0.02] border-white/10'}`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold">
                    Más popular
                  </span>
                )}
                <p className="font-bold text-gray-400 text-sm mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-gray-500 mb-5">{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <svg className="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.name === 'Premium' ? '/contacto' : '/registrar'}
                  className={`block w-full py-3 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${plan.highlight
                    ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-lg shadow-orange-500/25'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-6 space-y-2">
            <p className="text-xs text-gray-500">Todos los planes incluyen 14 días de prueba gratis · Sin tarjeta de crédito</p>
            <Link href="/planes" className="inline-block text-xs text-orange-400 hover:text-orange-300 underline underline-offset-2">
              Ver comparación completa de planes →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-orange-500/5 rounded-3xl blur-3xl -z-10" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            ¿Listo para vender<br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">más y sin complicaciones?</span>
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
            Únete a los restaurantes que ya digitalizaron su negocio. Sin contratos, sin comisiones por venta.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg transition-all shadow-xl shadow-orange-500/30 active:scale-95">
            Crear mi restaurante gratis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <p className="text-xs text-gray-500 mt-4">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-black">R</div>
            <span className="font-bold text-white text-sm">RestaurantOS</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <a href="#features" className="hover:text-gray-300 transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-gray-300 transition-colors">Precios</a>
            <a href="mailto:soporte@restaurantos.com" className="hover:text-gray-300 transition-colors">Soporte</a>
            <Link href="/login" className="hover:text-gray-300 transition-colors">Iniciar sesión</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 RestaurantOS. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  )
}
