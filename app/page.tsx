import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-sm font-black text-foreground">R</div>
            <span className="font-bold text-foreground text-lg tracking-tight">TuNegocio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funciones</a>
            <a href="#how" className="hover:text-foreground transition-colors">Cómo funciona</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precios</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link href="/register" className="px-4 py-2 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-semibold transition-colors">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Background glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Plataforma todo-en-uno para restaurantes
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-foreground">
            Tu restaurante,
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              en línea en minutos
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Crea tu tienda online, gestiona pedidos, reservas y pagos. Todo con tu marca, tu dominio y sin comisiones.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-primary hover:bg-blue-600 text-white font-bold text-base transition-all shadow-md hover:shadow-lg active:scale-95">
              Crear mi restaurante gratis
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border border-border hover:bg-muted text-foreground hover:text-foreground font-semibold text-base transition-all">
              Ya tengo cuenta →
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Sin tarjeta de crédito · 14 días gratis · Cancela cuando quieras</p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            {/* Fake browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-input flex items-center px-3">
                <span className="text-xs text-muted-foreground">tunegoocio.vercel.app/mi-pizzeria/admin</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Pedidos hoy', value: '34', change: '+12%', color: 'text-secondary' },
                { label: 'Ingresos mes', value: '$4.2M', change: '+8%', color: 'text-secondary' },
                { label: 'Reservas', value: '18', change: '3 pendientes', color: 'text-accent' },
                { label: 'Clientes', value: '312', change: '+5 nuevos', color: 'text-primary' },
              ].map(card => (
                <div key={card.label} className="bg-muted rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                  <p className="text-2xl font-black text-foreground">{card.value}</p>
                  <p className={`text-xs font-medium mt-1 ${card.color}`}>{card.change}</p>
                </div>
              ))}
              <div className="col-span-4 bg-muted rounded-lg p-4 border border-border">
                <p className="text-xs text-muted-foreground mb-3">Pedidos recientes</p>
                <div className="space-y-2">
                  {[
                    { num: '#0234', item: 'Pizza Margherita × 2', status: 'Preparando', color: 'bg-accent/10 text-accent' },
                    { num: '#0233', item: 'Hamburguesa Clásica × 1', status: 'En camino', color: 'bg-primary/10 text-primary' },
                    { num: '#0232', item: 'Lasaña + Ensalada', status: 'Entregado', color: 'bg-secondary/10 text-secondary' },
                  ].map(o => (
                    <div key={o.num} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono text-xs">{o.num}</span>
                      <span className="text-foreground flex-1 mx-4 truncate">{o.item}</span>
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
      <section className="py-12 px-6 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-8">
            Restaurantes que ya venden en línea
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-40">
            {['Pizzería Napoli', 'Burger Factory', 'Sushi Palace', 'La Parrilla', 'Tacos & Co', 'El Fogón'].map(name => (
              <span key={name} className="text-sm font-bold text-foreground tracking-wide">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Funciones</p>
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
              <div key={f.title} className="group p-6 rounded-2xl border border-border bg-card hover:bg-muted hover:border-border transition-all">
                <div className="text-3xl mb-4">{f.icon}</div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-bold text-foreground">{f.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{f.tag}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="py-24 px-6 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Proceso</p>
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
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                  <span className="text-primary font-black text-xl">{s.step}</span>
                </div>
                <h3 className="font-bold text-foreground text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-3">Precios</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Simple y transparente</h2>
            <p className="text-muted-foreground mt-4">Sin comisiones por venta. Pagas solo por el plan.</p>
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
                  ? 'bg-primary/10 border-orange-500/50'
                  : 'bg-card border-border'}`}>
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-foreground text-xs font-bold">
                    Más popular
                  </span>
                )}
                <p className="font-bold text-muted-foreground text-sm mb-1">{plan.name}</p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-black text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{plan.desc}</p>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.name === 'Premium' ? '/contacto' : '/registrar'}
                  className={`block w-full py-3 rounded-xl text-sm font-bold text-center transition-all active:scale-95 ${plan.highlight
                    ? 'bg-primary hover:bg-blue-600 text-white shadow-lg shadow-primary/25'
                    : 'bg-muted hover:bg-white/10 text-foreground border border-border'}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-6 space-y-2">
            <p className="text-xs text-muted-foreground">Todos los planes incluyen 14 días de prueba gratis · Sin tarjeta de crédito</p>
            <Link href="/planes" className="inline-block text-xs text-primary hover:text-orange-300 underline underline-offset-2">
              Ver comparación completa de planes →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center relative">
          <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl -z-10" />
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            ¿Listo para vender<br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">más y sin complicaciones?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Únete a los restaurantes que ya digitalizaron su negocio. Sin contratos, sin comisiones por venta.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary hover:bg-blue-600 text-white font-bold text-lg transition-all shadow-xl shadow-orange-500/30 active:scale-95">
            Crear mi restaurante gratis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">14 días gratis · Sin tarjeta · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xs font-black">R</div>
            <span className="font-bold text-foreground text-sm">Restaurant.SV</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Precios</a>
            <a href="mailto:soporte@restaurantos.com" className="hover:text-foreground transition-colors">Soporte</a>
            <Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 Restaurant.SV. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  )
}
