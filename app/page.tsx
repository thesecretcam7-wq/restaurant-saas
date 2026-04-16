import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white">E</div>
            <span className="font-bold text-foreground text-lg tracking-tight">Eccofood</span>
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
            <Link href="/register" className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all">
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-primary/10 to-secondary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Plataforma de gestión premium para restaurantes
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1] mb-6 text-foreground animate-slide-up">
            Tu restaurante prospera
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              con Eccofood
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
            Gestiona tu menú, pedidos, reservas y pagos en un solo lugar. Diseño moderno, sin comisiones y completamente personalizable.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-bold text-base transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 active:scale-95">
              Crear mi restaurante
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-lg border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-foreground font-semibold text-base transition-all">
              Ver demostración
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-6">14 días gratis · Sin tarjeta de crédito · Acceso completo</p>
        </div>

        {/* Dashboard mockup */}
        <div className="max-w-5xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" style={{ top: '60%' }} />
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl hover:shadow-2xl transition-all animate-scale-in">
            {/* Fake browser bar */}
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-muted/50">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-input flex items-center px-3">
                <span className="text-xs text-muted-foreground">eccofood.vercel.app/mi-restaurante/admin</span>
              </div>
            </div>
            {/* Dashboard preview */}
            <div className="p-6 grid grid-cols-4 gap-4">
              {[
                { label: 'Pedidos hoy', value: '48', change: '+25%', color: 'text-primary' },
                { label: 'Ingresos mes', value: '€8.5k', change: '+15%', color: 'text-secondary' },
                { label: 'Reservas', value: '22', change: '5 pendientes', color: 'text-accent' },
                { label: 'Clientes', value: '287', change: '+18 nuevos', color: 'text-primary' },
              ].map((card, i) => (
                <div key={card.label} className="bg-card rounded-xl p-4 border border-border/50 hover:border-primary/20 transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">{card.label}</p>
                  <p className="text-3xl font-black text-foreground">{card.value}</p>
                  <p className={`text-xs font-semibold mt-2 ${card.color}`}>{card.change}</p>
                </div>
              ))}
              <div className="col-span-4 bg-card rounded-xl p-4 border border-border/50">
                <p className="text-xs text-muted-foreground mb-4 font-semibold uppercase tracking-wide">Pedidos recientes</p>
                <div className="space-y-3">
                  {[
                    { num: '#0548', item: 'Pizza Napoli × 2 + Bebidas', status: 'Preparando', color: 'bg-accent/15 text-accent border-accent/30' },
                    { num: '#0547', item: 'Ensalada Caprese + Pan Tostado', status: 'En camino', color: 'bg-primary/15 text-primary border-primary/30' },
                    { num: '#0546', item: 'Pasta Carbonara × 3', status: 'Entregado', color: 'bg-secondary/15 text-secondary border-secondary/30' },
                  ].map(o => (
                    <div key={o.num} className={`flex items-center justify-between text-sm p-3 rounded-lg border ${o.color}`}>
                      <span className="text-foreground font-mono text-sm font-semibold">{o.num}</span>
                      <span className="text-foreground flex-1 mx-4 truncate text-sm">{o.item}</span>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap`}>{o.status}</span>
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
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-4">Características</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Herramientas completas<br />para restaurantes modernos</h2>
            <p className="text-muted-foreground mt-4 text-lg">Todo lo que necesitas para prosperar, sin complejidades innecesarias</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '🛍️',
                title: 'Menú Digital',
                desc: 'Catálogo profesional con fotos, descripciones y precios. Actualizaciones instantáneas.',
                color: 'from-primary',
              },
              {
                icon: '📦',
                title: 'Gestión de Pedidos',
                desc: 'Panel en tiempo real con notificaciones. Organiza cocina y entregas desde un solo lugar.',
                color: 'from-secondary',
              },
              {
                icon: '📅',
                title: 'Sistema de Reservas',
                desc: 'Reservaciones con confirmación automática, gestión de mesas y recordatorios.',
                color: 'from-accent',
              },
              {
                icon: '💳',
                title: 'Pagos Seguros',
                desc: 'Integración con Stripe. Tus clientes pagan, el dinero llega directamente a tu cuenta.',
                color: 'from-primary',
              },
              {
                icon: '🎨',
                title: 'Tu Identidad Visual',
                desc: 'Personaliza colores, fuentes, logo. Tu marca brilla en cada pedido y email.',
                color: 'from-secondary',
              },
              {
                icon: '🌐',
                title: 'Dominio Personalizado',
                desc: 'Conecta turestaurante.com en minutos. Crea presencia profesional online.',
                color: 'from-accent',
              },
              {
                icon: '🚗',
                title: 'Delivery Integrado',
                desc: 'Gestiona entregas a domicilio con zonas, tarifas y tiempos estimados configurables.',
                color: 'from-primary',
              },
              {
                icon: '📊',
                title: 'Analytics Inteligente',
                desc: 'Reportes de ventas, productos top, análisis de clientes. Crece con datos.',
                color: 'from-secondary',
              },
              {
                icon: '📱',
                title: 'App Nativa (PWA)',
                desc: 'Tus clientes descargan desde el navegador. Sin depender de App Store.',
                color: 'from-accent',
              },
            ].map((f, i) => (
              <div key={f.title} className="group relative p-6 rounded-xl border border-border bg-card/50 hover:bg-card/80 hover:border-primary/30 transition-all overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="text-4xl mb-4">{f.icon}</div>
                  <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
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
      <section id="pricing" className="py-24 px-6 border-t border-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-primary text-sm font-semibold uppercase tracking-widest mb-4">Planes</p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Precios diseñados para crecer</h2>
            <p className="text-muted-foreground mt-4 text-lg">Sin comisiones por venta. Pagas solo lo que usas, cuando lo usas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Essentials',
                price: '€39',
                period: '/mes',
                desc: 'Perfecto para comenzar',
                features: ['Menú digital profesional', 'Gestión de pedidos', 'Hasta 500 pedidos/mes', '1 usuario', 'Soporte email'],
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
            ].map((plan, i) => (
              <div key={plan.name}
                className={`rounded-2xl p-8 border transition-all relative overflow-hidden group ${plan.highlight
                  ? 'bg-gradient-to-br from-primary/15 to-secondary/10 border-primary/40 shadow-xl shadow-primary/10 scale-105'
                  : 'bg-card/50 border-border hover:border-border/80'}`}>
                {plan.highlight && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <div className="relative z-10">
                  {plan.highlight && (
                    <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold mb-4">
                      ⭐ Más elegido
                    </span>
                  )}
                  <p className="font-bold text-muted-foreground text-sm mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-black text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-sm mb-2">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{plan.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                        <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-accent' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register"
                    className={`block w-full py-3 rounded-lg text-sm font-bold text-center transition-all active:scale-95 ${plan.highlight
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40'
                      : 'bg-muted/50 hover:bg-muted text-foreground border border-border/50'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 space-y-2">
            <p className="text-sm text-muted-foreground">Todos los planes incluyen <strong>14 días gratis</strong> • Sin tarjeta de crédito requerida</p>
            <Link href="/pricing" className="inline-block text-sm text-primary hover:text-primary/80 font-medium underline underline-offset-2">
              Ver comparación completa de planes →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-6 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 -z-10" />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl -z-10" />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 animate-slide-up">
            Tu restaurante merece<br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">una plataforma excepcional</span>
          </h2>
          <p className="text-muted-foreground text-xl mb-10 max-w-xl mx-auto leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
            Destáchate con un sistema profesional que simplifica operaciones y amplifica tus ventas. Sin comisiones, sin sorpresas.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold text-lg transition-all shadow-lg shadow-primary/40 hover:shadow-xl active:scale-95 animate-slide-up" style={{ animationDelay: '200ms' }}>
            Crear mi restaurante gratis
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <p className="text-sm text-muted-foreground mt-6 font-medium">14 días gratis • Acceso completo • Sin tarjeta requerida</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-12 px-6 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-black text-white">E</div>
                <span className="font-bold text-foreground text-lg">Eccofood</span>
              </div>
              <p className="text-sm text-muted-foreground">Plataforma de gestión premium para restaurantes modernos.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Producto</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Características</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Precios</a></li>
                <li><a href="#how" className="hover:text-foreground transition-colors">Cómo funciona</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Empresa</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="mailto:soporte@eccofood.com" className="hover:text-foreground transition-colors">Soporte</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><Link href="/login" className="hover:text-foreground transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-3 text-sm">Legal</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Términos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacidad</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 Eccofood. Todos los derechos reservados. Hecho con ❤️ para restaurantes.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 002.856-3.86 10.02 10.02 0 01-2.856.975v.001c-.36-.648-1.086-1.08-1.796-1.08.697 0 1.295-.342 1.636-.852-.665.398-1.401.683-2.189.833-.628-.677-1.521-1.1-2.506-1.1-1.894 0-3.433 1.539-3.433 3.433 0 .269.032.532.097.788-2.854-.143-5.39-1.512-7.087-3.592a3.43 3.43 0 001.063 4.586c-.64-.02-1.242-.196-1.768-.496v.044c0 1.664 1.184 3.053 2.756 3.369-.288.08-.593.123-.91.123-.223 0-.439-.02-.651-.064.44 1.353 1.702 2.34 3.194 2.368-1.175.923-2.654 1.474-4.264 1.474-.277 0-.55-.016-.819-.048 1.5.961 3.285 1.522 5.2 1.522 6.239 0 9.637-5.168 9.637-9.637 0-.147-.003-.293-.01-.438.662-.477 1.24-1.074 1.694-1.757z"/></svg>
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.475-2.236-1.986-2.236-1.081 0-1.722.732-2.004 1.438-.103.25-.129.599-.129.948v5.419h-3.554s.047-8.733 0-9.635h3.554v1.364c.429-.661 1.196-1.6 2.905-1.6 2.122 0 3.714 1.388 3.714 4.37v5.501zM5.337 6.556a2.06 2.06 0 01-2.063-2.065c0-1.138.927-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.896H3.555V9.817h3.564v10.635zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
