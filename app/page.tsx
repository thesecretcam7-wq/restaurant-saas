import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  Clock3,
  CreditCard,
  LayoutDashboard,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Utensils,
} from 'lucide-react'

const metrics = [
  { label: 'Pedidos hoy', value: '186', delta: '+28%' },
  { label: 'Ticket medio', value: '24.80', delta: '+12%' },
  { label: 'Mesas activas', value: '34', delta: 'en vivo' },
]

const features = [
  { icon: QrCode, title: 'QR y menu digital', text: 'Pedidos desde mesa, kiosko o delivery con una experiencia rapida y clara.' },
  { icon: LayoutDashboard, title: 'Panel operativo', text: 'Ventas, productos, reservas, clientes y turnos en una sola cabina de mando.' },
  { icon: ChefHat, title: 'Cocina sincronizada', text: 'Pantalla KDS, estados de pedido y flujo de preparacion sin llamadas ni papeles.' },
  { icon: CreditCard, title: 'Pagos y suscripciones', text: 'Stripe, planes, facturacion y control de acceso listo para escalar.' },
  { icon: ReceiptText, title: 'TPV completo', text: 'Carritos POS, tickets, caja, cierres, impresoras y roles de staff.' },
  { icon: BarChart3, title: 'Datos accionables', text: 'Analitica, productos top, ingresos, clientes y rendimiento por periodo.' },
]

const plans = [
  { name: 'Starter', price: '39', text: 'Para restaurantes que quieren ordenar su operacion digital.', items: ['Menu digital', 'Pedidos online', 'Panel admin', 'Soporte base'] },
  { name: 'Growth', price: '99', text: 'Para equipos que venden en sala, delivery y reservas.', items: ['Todo Starter', 'POS y cocina', 'Reservas', 'Analitica avanzada'], featured: true },
  { name: 'Scale', price: 'Custom', text: 'Para grupos, franquicias y operaciones con multiples locales.', items: ['Multi local', 'Integraciones', 'Onboarding dedicado', 'Soporte prioritario'] },
]

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#15130f]">
      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f5f0]/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#e43d30] text-sm font-black text-white shadow-sm">E</span>
            <span className="text-lg font-black tracking-tight">Eccofood</span>
          </Link>
          <div className="hidden items-center gap-7 text-sm font-semibold text-black/60 md:flex">
            <a href="#producto" className="transition hover:text-black">Producto</a>
            <a href="#operacion" className="transition hover:text-black">Operacion</a>
            <a href="#planes" className="transition hover:text-black">Planes</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden rounded-lg px-4 py-2 text-sm font-bold text-black/70 transition hover:bg-black/5 sm:block">
              Entrar
            </Link>
            <Link href="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#15130f] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#2a261f]">
              Probar gratis
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:pb-20 lg:pt-20">
        <div className="flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[#e43d30]/25 bg-white/70 px-3 py-1.5 text-xs font-black uppercase text-[#b72920] shadow-sm">
            <span className="size-2 rounded-full bg-[#e43d30]" />
            Plataforma SaaS para restaurantes modernos
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-[#15130f] sm:text-6xl lg:text-7xl">
            Control total del restaurante, sin perder velocidad.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-black/64">
            Eccofood une menu digital, pedidos QR, POS, cocina, reservas, inventario, staff, pagos y analitica en una aplicacion que se siente seria desde el primer clic.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e43d30] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:bg-[#c93228]">
              Crear restaurante
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-lg border border-black/12 bg-white/70 px-6 py-3.5 text-sm font-black text-black shadow-sm transition hover:bg-white">
              Ver panel
            </Link>
          </div>
          <div className="mt-7 grid max-w-xl grid-cols-1 gap-3 text-sm font-semibold text-black/64 sm:grid-cols-3">
            {['Sin comisiones por venta', 'PWA instalable', 'Multi tenant'].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <Check className="size-4 text-[#1c8b5f]" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-10 top-8 h-72 rounded-[32px] bg-[#e43d30]/18 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-black/10 bg-[#15130f] p-3 shadow-2xl shadow-black/20">
            <div className="rounded-xl border border-white/10 bg-[#201c17]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="rounded-md bg-white/8 px-3 py-1 text-[11px] font-semibold text-white/55">dashboard.eccofood</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xs font-bold uppercase text-white/45">{metric.label}</p>
                    <p className="mt-3 text-3xl font-black text-white">{metric.value}</p>
                    <p className="mt-1 text-xs font-bold text-[#84e0ad]">{metric.delta}</p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 p-4 pt-0 lg:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-white">Pedidos en vivo</p>
                      <p className="text-xs text-white/45">Sala, QR, delivery y POS</p>
                    </div>
                    <Clock3 className="size-5 text-[#f4b860]" />
                  </div>
                  <div className="space-y-3">
                    {['Mesa 08 - 3 platos', 'Delivery - listo para enviar', 'POS barra - pagado'].map((order, index) => (
                      <div key={order} className="flex items-center justify-between rounded-lg bg-black/18 px-3 py-3">
                        <span className="text-sm font-semibold text-white/82">{order}</span>
                        <span className="rounded-md bg-[#e43d30] px-2 py-1 text-[11px] font-black text-white">#{142 + index}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#f4b860] p-4 text-[#15130f]">
                  <ShieldCheck className="mb-8 size-7" />
                  <p className="text-sm font-black">Operacion lista para crecer</p>
                  <p className="mt-2 text-sm font-medium text-black/62">Roles, permisos, suscripciones, auditoria y seguridad desde la base.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="producto" className="border-y border-black/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase text-[#e43d30]">Producto</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Una app, todos los flujos.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-xl border border-black/10 bg-[#fbfaf7] p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5">
                <Icon className="size-6 text-[#e43d30]" />
                <h3 className="mt-6 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/60">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="operacion" className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:py-20">
        <div>
          <p className="text-sm font-black uppercase text-[#e43d30]">Operacion</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Pensado para horas punta.</h2>
          <p className="mt-5 text-base leading-7 text-black/62">
            La interfaz prioriza velocidad, lectura rapida y accion directa. Lo importante esta arriba, los estados son claros y cada modulo mantiene el mismo lenguaje visual.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['01', 'Alta y acceso', 'Registro, login y seleccion de restaurante sin friccion.'],
            ['02', 'Venta diaria', 'Pedidos, TPV, cocina, pantalla y caja trabajando juntos.'],
            ['03', 'Gestion', 'Productos, promociones, inventario, staff, mesas y reservas.'],
            ['04', 'Crecimiento', 'Analitica, ingresos, facturas, planes y clientes recurrentes.'],
          ].map(([step, title, text]) => (
            <div key={step} className="rounded-xl border border-black/10 bg-white/70 p-5">
              <p className="text-sm font-black text-[#e43d30]">{step}</p>
              <h3 className="mt-3 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-black/58">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="planes" className="bg-[#15130f] px-4 py-16 text-white sm:px-6 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#f4b860]">Planes</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Precio simple. Producto completo.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/58">Prueba sin tarjeta y activa el plan que encaje con la operacion real del restaurante.</p>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`rounded-xl border p-6 ${plan.featured ? 'border-[#f4b860] bg-white text-[#15130f]' : 'border-white/12 bg-white/[0.06]'}`}>
                <p className="text-sm font-black">{plan.name}</p>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-5xl font-black">{plan.price === 'Custom' ? plan.price : `${plan.price}`}</span>
                  {plan.price !== 'Custom' && <span className="pb-2 text-sm font-bold opacity-60">EUR/mes</span>}
                </div>
                <p className={`mt-4 text-sm leading-6 ${plan.featured ? 'text-black/60' : 'text-white/58'}`}>{plan.text}</p>
                <div className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm font-semibold">
                      <Check className={`size-4 ${plan.featured ? 'text-[#1c8b5f]' : 'text-[#f4b860]'}`} />
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/register" className={`mt-7 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-black transition ${plan.featured ? 'bg-[#15130f] text-white hover:bg-black' : 'bg-white text-[#15130f] hover:bg-[#f4b860]'}`}>
                  Empezar
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#f7f5f0] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-sm font-semibold text-black/55 md:flex-row md:items-center">
          <p>Eccofood, plataforma para restaurantes que quieren operar mejor.</p>
          <div className="flex gap-5">
            <Link href="/login" className="hover:text-black">Login</Link>
            <Link href="/register" className="hover:text-black">Registro</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
