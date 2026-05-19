'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import EccofoodLogo from '@/components/EccofoodLogo'
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher'
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ChefHat,
  Clock3,
  CreditCard,
  Globe2,
  Layers3,
  LineChart,
  MapPin,
  Menu,
  Package,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
  UsersRound,
  Zap,
} from 'lucide-react'

const restaurantLogos = [
  { name: 'Parrilla Norte', initials: 'PN', color: '#101010' },
  { name: 'Casa Brava', initials: 'CB', color: '#b91c1c' },
  { name: 'Sushi Alto', initials: 'SA', color: '#0f766e' },
  { name: 'Bistro 88', initials: 'B8', color: '#4338ca' },
  { name: 'La Terraza', initials: 'LT', color: '#c2410c' },
]

const impactMetrics = [
  { value: '24/7', label: 'tienda abierta', detail: 'pedidos, QR y reservas aunque el equipo este ocupado' },
  { value: '1 flujo', label: 'caja y cocina', detail: 'TPV, comandas, KDS e inventario trabajando juntos' },
  { value: '30 dias', label: 'prueba gratis', detail: 'tiempo real para probarlo con el equipo del restaurante' },
  { value: '0%', label: 'comision propia', detail: 'vende desde tu canal sin depender solo de marketplaces' },
]

const features = [
  {
    icon: ReceiptText,
    title: 'POS inteligente',
    text: 'Venta rapida, mesas, tickets, caja, descuentos y cobro centralizado en una interfaz precisa.',
    stat: '2.4s por item',
    visual: 'pos',
  },
  {
    icon: QrCode,
    title: 'QR Menu Digital',
    text: 'Carta responsive con branding del restaurante, categorias fijas, productos visuales y pedido directo.',
    stat: 'QR listo',
    visual: 'qr',
  },
  {
    icon: ChefHat,
    title: 'Pantalla cocina KDS',
    text: 'Pedidos sincronizados, alertas sonoras, estados por producto y orden visual para horas punta.',
    stat: '-40% errores',
    visual: 'kds',
  },
  {
    icon: Truck,
    title: 'Delivery propio',
    text: 'Tienda online, pedidos para llevar, delivery, cobro y notificaciones sin depender de marketplaces caros.',
    stat: '0% comision abusiva',
    visual: 'delivery',
  },
  {
    icon: CalendarCheck,
    title: 'Reservas online',
    text: 'Disponibilidad, horarios, clientes y mesas en un flujo simple para llenar mejor el salon.',
    stat: '24/7 reservas',
    visual: 'reservas',
  },
  {
    icon: LineChart,
    title: 'Reportes en tiempo real',
    text: 'Ventas, productos top, ticket medio, clientes, inventario y rendimiento para decidir con datos.',
    stat: 'dashboard live',
    visual: 'analytics',
  },
  {
    icon: Store,
    title: 'Multi sucursal',
    text: 'Pensado para crecer: varias marcas, locales, equipos y permisos desde una arquitectura SaaS.',
    stat: 'escala lista',
    visual: 'multi',
  },
]

const testimonials = [
  {
    name: 'Parrilla Urbana',
    role: 'Escenario restaurante casual',
    quote: 'Pasamos de manejar pedidos en WhatsApp a tener caja, cocina y QR en el mismo flujo. Se siente como software de cadena grande.',
    result: 'QR + tienda',
  },
  {
    name: 'Brasa 42',
    role: 'Escenario cocina con alta demanda',
    quote: 'El equipo entendio la app rapido. Lo que mas nos cambio fue cocina: menos gritos, menos errores y mejor velocidad.',
    result: 'cocina ordenada',
  },
  {
    name: 'Terraza Central',
    role: 'Escenario restaurante con QR',
    quote: 'La carta se ve premium en celular y podemos cambiar banners y productos sin llamar a nadie. Eso nos da control.',
    result: 'marca premium',
  },
]

const pricingPlans = [
  { name: 'Basic', monthly: 49.99, annual: 539.89, discount: 'Ahorra 60.00 EUR', features: ['Carta QR incluida', 'TPV / POS', 'Comandero', 'KDS cocina'] },
  { name: 'Pro', monthly: 99.99, annual: 1079.89, discount: 'Ahorra 120.00 EUR', features: ['Carta QR incluida', 'TPV / POS + Comandero + KDS', 'Pagina web', 'Kiosko autoservicio'], popular: true },
  { name: 'Premium', monthly: 299.99, annual: 3239.89, discount: 'Ahorra 360.00 EUR', features: ['Carta QR incluida', 'Todas las funciones', 'Disenos exclusivos por cliente', 'Acompanamiento premium'] },
]

const before = ['Pedidos por llamada', 'Comandas en papel', 'Errores en cocina', 'Caja desconectada', 'Reportes manuales']
const after = ['QR y tienda online', 'KDS sincronizado', 'Estados en tiempo real', 'TPV conectado', 'Analiticas automaticas']

const sellPoints = [
  {
    icon: QrCode,
    title: 'El cliente pide sin esperar',
    text: 'Carta QR, tienda online y kiosko reducen friccion: el cliente ve fotos, elige, agrega extras y manda el pedido.',
  },
  {
    icon: CreditCard,
    title: 'Mas pedidos por canales propios',
    text: 'El restaurante puede vender directo desde su web, QR, mesa, mostrador o kiosko sin depender solo de apps externas.',
  },
  {
    icon: ChefHat,
    title: 'La cocina recibe ordenado',
    text: 'Comandero y KDS hacen que cada pedido llegue claro, con estados, tiempos y menos errores en horas fuertes.',
  },
  {
    icon: BarChart3,
    title: 'El dueno ve que esta pasando',
    text: 'Ventas, productos mas pedidos, caja, inventario y cierres quedan conectados para tomar decisiones con datos.',
  },
]

const salesProcess = [
  {
    step: '01',
    title: 'Mostramos el problema',
    text: 'Pedidos dispersos, carta vieja, errores en cocina, poca visibilidad y dependencia de terceros.',
  },
  {
    step: '02',
    title: 'Ensenamos la solucion funcionando',
    text: 'Demo real con tienda, QR, TPV, comandero, KDS y kiosko para que el dueno vea el flujo completo.',
  },
  {
    step: '03',
    title: 'Activamos su restaurante',
    text: 'El cliente crea su cuenta, carga productos, logo, colores, horarios, banners y empieza con 30 dias gratis.',
  },
  {
    step: '04',
    title: 'Vendemos crecimiento',
    text: 'No vendemos botones: vendemos mas control, mas pedidos directos, menos errores y una marca mas profesional.',
  },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] },
  }
}

function MockupDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/82 p-3 shadow-[0_35px_120px_rgba(17,24,39,0.22)] backdrop-blur-xl"
      >
        <div className="overflow-hidden rounded-[1.35rem] border border-black/8 bg-[#0d0f14]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-black text-white/45">dashboard.eccofood</span>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-[0.72fr_1.28fr]">
            <div className="space-y-3">
              {[
                ['Ventas hoy', '4.820 EUR', '+32%'],
                ['Pedidos QR', '186', 'live'],
                ['Ticket medio', '24.80 EUR', '+11%'],
              ].map(([label, value, trend]) => (
                <motion.div
                  key={label}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                >
                  <p className="text-xs font-black uppercase text-white/38">{label}</p>
                  <p className="mt-3 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-black text-[#ff9f43]">{trend}</p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-white">Operacion en vivo</p>
                  <p className="text-xs font-bold text-white/42">Sala, QR, delivery y POS</p>
                </div>
                <Zap className="size-5 text-[#ff9f43]" />
              </div>
              <div className="grid h-36 grid-cols-10 items-end gap-2">
                {[34, 48, 42, 66, 58, 78, 64, 88, 72, 94].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.8, delay: index * 0.06 }}
                    className="rounded-t-lg bg-gradient-to-t from-[#ff6b1a] to-[#ffd28a]"
                  />
                ))}
              </div>
              <div className="mt-5 space-y-2">
                {['Mesa 08 - listo para cobrar', 'Kiosko - pedido #184', 'Delivery - pagado con Stripe'].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2">
                    <span className="truncate text-xs font-bold text-white/72">{item}</span>
                    <span className="rounded-full bg-[#ff6b1a] px-2 py-1 text-[10px] font-black text-white">#{182 + index}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-8 left-4 hidden rounded-2xl border border-black/10 bg-white/88 p-4 shadow-2xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-[#101010] text-white">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black text-[#101010]">Pago confirmado</p>
            <p className="text-xs font-bold text-black/45">Stripe Connect seguro</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FeatureVisual({ type }: { type: string }) {
  const data: Record<string, {
    eyebrow: string
    title: string
    subtitle: string
    side: string
    rows: string[]
    metric: string
    accent?: string
  }> = {
    pos: {
      eyebrow: 'TPV EN CAJA',
      title: 'Pedido #184',
      subtitle: 'Mesa 08 · pagado',
      side: 'Total',
      rows: ['Burger doble', 'Papas fritas', 'Bebida'],
      metric: '24.80 EUR',
    },
    qr: {
      eyebrow: 'CARTA QR',
      title: 'Mesa 12',
      subtitle: 'El cliente pide desde su movil',
      side: 'QR',
      rows: ['Escanea', 'Elige extras', 'Envia a cocina'],
      metric: 'sin esperar',
    },
    kds: {
      eyebrow: 'KDS COCINA',
      title: '3 comandas activas',
      subtitle: 'Ordenadas por prioridad',
      side: 'Listo',
      rows: ['Preparando · Burger', 'Pendiente · Ensalada', 'Listo · Mesa 04'],
      metric: 'menos errores',
    },
    delivery: {
      eyebrow: 'VENTA DIRECTA',
      title: 'Pedido delivery',
      subtitle: 'Canal propio del restaurante',
      side: 'Web',
      rows: ['Cliente confirma', 'Pago registrado', 'Reparto asignado'],
      metric: '0% comision',
    },
    reservas: {
      eyebrow: 'RESERVAS',
      title: 'Viernes 21:00',
      subtitle: 'Mesas y horarios controlados',
      side: '6 pax',
      rows: ['Mesa disponible', 'Cliente confirmado', 'Recordatorio listo'],
      metric: '24/7',
    },
    analytics: {
      eyebrow: 'REPORTES',
      title: 'Ventas en vivo',
      subtitle: 'Datos para decidir hoy',
      side: '+32%',
      rows: ['Producto top', 'Ticket medio', 'Hora pico'],
      metric: 'dashboard',
    },
    multi: {
      eyebrow: 'CRECIMIENTO',
      title: 'Multi sucursal',
      subtitle: 'Marcas, equipos y permisos',
      side: 'SaaS',
      rows: ['Sucursal centro', 'Sucursal norte', 'Nuevo local'],
      metric: 'escala lista',
    },
  }
  const visual = data[type] || data.pos

  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-[1.6rem] border border-slate-900/10 bg-[#111827] p-4 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(230,95,26,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(255,255,255,0.10),transparent_34%)]" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase text-white/64">{visual.eyebrow}</span>
          <span className="rounded-full bg-[#e65f1a] px-3 py-1 text-xs font-black text-white">{visual.side}</span>
        </div>

        <div className="mt-7 grid flex-1 gap-4 sm:grid-cols-[1fr_0.78fr]">
          <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.08] p-5">
            <p className="text-sm font-black text-white/55">{visual.subtitle}</p>
            <h4 className="mt-2 text-3xl font-black leading-none tracking-tight text-white">{visual.title}</h4>
            <div className="mt-6 space-y-3">
              {visual.rows.map((row, index) => (
                <motion.div
                  key={row}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between rounded-2xl bg-black/18 px-4 py-3"
                >
                  <span className="text-sm font-bold text-white/80">{row}</span>
                  <span className={`size-2.5 rounded-full ${index === 2 ? 'bg-emerald-300' : 'bg-[#f59e0b]'}`} />
                </motion.div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.35rem] border border-white/10 bg-white p-4 text-[#111827]">
              <p className="text-xs font-black uppercase text-slate-400">Resultado</p>
              <p className="mt-2 text-2xl font-black leading-tight">{visual.metric}</p>
            </div>
            <div className="rounded-[1.35rem] border border-white/10 bg-[#e65f1a] p-4 text-white">
              <p className="text-xs font-black uppercase text-white/70">Accion</p>
              <p className="mt-2 text-lg font-black leading-tight">Listo para operar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EccofoodLanding() {
  const { tr } = useI18n()
  const navItems = [
    { label: tr('landing.nav.features'), href: '#funciones' },
    { label: tr('landing.nav.pricing'), href: '#precios' },
    { label: tr('landing.nav.demo'), href: '#demo' },
    { label: tr('landing.nav.cases'), href: '#casos-de-exito' },
  ]
  const footerHref = (link: string) => {
    if (link === 'Soporte' || link === 'Contacto') return '/soporte'
    if (link === 'Demo') return '#demo'
    return '#'
  }

  return (
    <main className="ecco-landing-premium min-h-screen overflow-x-hidden text-white">
      <nav className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="md" showText={false} />
            <div>
              <p className="text-lg font-black tracking-tight">Eccofood</p>
              <p className="-mt-1 text-[11px] font-black uppercase text-black/38">Restaurant OS</p>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-black text-black/54 lg:flex">
            {navItems.map(item => (
              <a key={item.href} href={item.href} className="transition hover:text-black">
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher compact className="hidden border-black/8 bg-white/70 sm:inline-flex" />
            <Link href="/login" className="rounded-xl px-3 py-2.5 text-xs font-black text-black/64 transition hover:bg-black/[0.04] hover:text-black sm:px-4 sm:text-sm">
              <span className="sm:hidden">{tr('common.enter')}</span>
              <span className="hidden sm:inline">{tr('common.login')}</span>
            </Link>
            <Link href="/register" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#ff6b1a] px-3 text-xs font-black text-white shadow-lg shadow-orange-900/14 transition hover:-translate-y-0.5 hover:bg-[#ed5f12] sm:h-11 sm:gap-2 sm:px-4 sm:text-sm">
              <span className="sm:hidden">Free</span>
              <span className="hidden sm:inline">{tr('common.startFree')}</span>
              <ArrowRight className="size-3.5 sm:size-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 lg:pb-28 lg:pt-24">
        <div className="absolute left-1/2 top-0 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,107,26,0.18),transparent_64%)] blur-2xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div {...fadeUp()}>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-black uppercase text-black/58 shadow-sm">
              <Star className="size-4 fill-[#ffb366] text-[#ff9f43]" />
              30 dias gratis · Sin permanencia mensual
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl lg:text-7xl">
              {tr('landing.hero.title')}
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-semibold leading-8 text-black/58">
              {tr('landing.hero.subtitle')}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="group inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#101010] px-7 text-sm font-black text-white shadow-2xl shadow-black/18 transition hover:-translate-y-0.5">
                {tr('common.createRestaurant')}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/elbuenpaladar" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-7 text-sm font-black text-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
                {tr('common.liveDemo')}
              </Link>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex -space-x-2">
                {restaurantLogos.slice(0, 4).map(restaurant => (
                  <div key={restaurant.name} className="grid size-10 place-items-center rounded-full border-2 border-[#f8f7f3] text-xs font-black text-white shadow-sm" style={{ backgroundColor: restaurant.color }}>
                    {restaurant.initials}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-1 text-[#ff9f43]">
                  {[0, 1, 2, 3, 4].map(i => <Star key={i} className="size-4 fill-current" />)}
                </div>
                <p className="mt-1 text-sm font-bold text-black/50">{tr('landing.hero.for')}</p>
              </div>
            </div>
          </motion.div>

          <MockupDashboard />
        </div>
      </section>

      <section className="border-y border-black/[0.06] bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm font-black uppercase text-black/38">{tr('landing.logos.title')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {restaurantLogos.map(restaurant => (
              <div key={restaurant.name} className="flex items-center justify-center gap-2 rounded-2xl border border-black/8 bg-[#faf9f6] px-4 py-3 text-center text-sm font-black text-black/58">
                <span className="grid size-8 place-items-center rounded-xl text-[11px] text-white" style={{ backgroundColor: restaurant.color }}>
                  {restaurant.initials}
                </span>
                {restaurant.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {impactMetrics.map((metric, index) => (
            <motion.article key={metric.label} {...fadeUp(index * 0.06)} className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-sm">
              <p className="text-5xl font-black tracking-tight text-[#ff6b1a]">{metric.value}</p>
              <h3 className="mt-4 text-lg font-black">{metric.label}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-black/50">{metric.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-white px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#ff6b1a]">Como vende Eccofood</p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                La landing debe vender una promesa simple: mas pedidos, menos caos y mas control.
              </h2>
            </div>
            <p className="text-base font-semibold leading-7 text-black/55">
              El restaurante no compra una pantalla bonita. Compra una forma de vender directo, atender mas rapido, reducir errores y tener una operacion que se siente profesional.
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {sellPoints.map((point, index) => {
              const Icon = point.icon
              return (
                <motion.article key={point.title} {...fadeUp(index * 0.06)} className="rounded-[1.6rem] border border-black/8 bg-[#faf9f6] p-6 shadow-sm">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#101010] text-white">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-black leading-tight">{point.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-black/55">{point.text}</p>
                </motion.article>
              )
            })}
          </div>

          <motion.div {...fadeUp(0.08)} className="mt-12 overflow-hidden rounded-[2rem] border border-black/8 bg-[#101010] text-white shadow-[0_35px_100px_rgba(17,17,17,0.20)]">
            <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
              <div className="p-8 sm:p-10">
                <p className="text-sm font-black uppercase text-[#ffb366]">Como lo vendemos nosotros</p>
                <h3 className="mt-4 text-4xl font-black leading-tight tracking-tight">
                  No hablamos de software. Hablamos de dinero, tiempo y control.
                </h3>
                <p className="mt-5 text-base font-semibold leading-7 text-white/58">
                  El mensaje comercial de Eccofood debe ser directo: instalamos una operacion digital completa para que el restaurante venda por QR, web, TPV y kiosko sin perder el control de cocina, caja e inventario.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/register" className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-[#ff6b1a] px-6 text-sm font-black text-white shadow-xl shadow-orange-950/24 transition hover:-translate-y-0.5">
                    Crear restaurante gratis
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href="/planes" className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/12 bg-white/8 px-6 text-sm font-black text-white transition hover:bg-white/12">
                    Ver planes
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:border-l lg:border-t-0">
                <div className="grid gap-3">
                  {salesProcess.map(item => (
                    <div key={item.step} className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
                      <div className="flex items-start gap-4">
                        <span className="grid size-11 flex-shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-[#101010]">
                          {item.step}
                        </span>
                        <div>
                          <h4 className="text-lg font-black">{item.title}</h4>
                          <p className="mt-2 text-sm font-semibold leading-6 text-white/58">{item.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="funciones" className="bg-white px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-[#ff6b1a]">{tr('landing.features.eyebrow')}</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {tr('landing.features.title')}
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-black/55">
              {tr('landing.features.subtitle')}
            </p>
          </motion.div>

          <div className="mt-14 space-y-10">
            {features.map((feature, index) => {
              const Icon = feature.icon
              const flipped = index % 2 === 1
              return (
                <motion.article
                  key={feature.title}
                  {...fadeUp()}
                  className={`landing-feature-card grid gap-6 rounded-[2rem] border border-black/8 bg-[#faf9f6] p-4 shadow-sm lg:grid-cols-2 lg:p-6 ${flipped ? 'lg:[&>div:first-child]:order-2' : ''}`}
                >
                  <div className="flex flex-col justify-center p-2 sm:p-6">
                    <div className="mb-6 grid size-13 place-items-center rounded-2xl bg-[#101010] text-white">
                      <Icon className="size-6" />
                    </div>
                    <p className="mb-3 w-fit rounded-full bg-[#ff6b1a]/10 px-3 py-1 text-xs font-black uppercase text-[#c54a0c]">{feature.stat}</p>
                    <h3 className="text-3xl font-black tracking-tight sm:text-4xl">{feature.title}</h3>
                    <p className="mt-4 max-w-xl text-base font-semibold leading-7 text-black/55">{feature.text}</p>
                  </div>
                  <FeatureVisual type={feature.visual} />
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="casos-de-exito" className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#ff6b1a]">{tr('landing.scenarios.eyebrow')}</p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                {tr('landing.scenarios.title')}
              </h2>
            </div>
            <div className="rounded-2xl border border-black/8 bg-white px-5 py-4 shadow-sm">
              <p className="text-3xl font-black text-[#101010]">30 dias</p>
              <p className="text-sm font-bold text-black/45">para probar el flujo completo</p>
            </div>
          </motion.div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.article key={testimonial.name} {...fadeUp(index * 0.08)} className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#101010] text-sm font-black text-white">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black">{testimonial.name}</p>
                    <p className="text-sm font-bold text-black/42">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-base font-semibold leading-7 text-black/62">"{testimonial.quote}"</p>
                <p className="mt-6 w-fit rounded-full bg-[#ff6b1a]/10 px-4 py-2 text-sm font-black text-[#c54a0c]">{testimonial.result}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#101010] px-4 py-18 text-white sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase text-[#ffb366]">{tr('landing.compare.eyebrow')}</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {tr('landing.compare.title')}
            </h2>
          </motion.div>

          <div className="mt-12 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-6">
              <h3 className="text-2xl font-black text-white/78">{tr('landing.compare.before')}</h3>
              <div className="mt-6 space-y-3">
                {before.map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/24 px-4 py-3 text-sm font-bold text-white/58">
                    <span className="grid size-7 place-items-center rounded-full bg-red-500/18 text-red-200">x</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[2rem] border border-[#ff9f43]/28 bg-[#ff6b1a] p-6 text-white shadow-[0_30px_90px_rgba(255,107,26,0.25)]">
              <h3 className="text-2xl font-black">{tr('landing.compare.after')}</h3>
              <div className="mt-6 space-y-3">
                {after.map(item => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/16 px-4 py-3 text-sm font-black">
                    <span className="grid size-7 place-items-center rounded-full bg-white text-[#101010]"><Check className="size-4" /></span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="precios" className="bg-white px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <motion.div {...fadeUp()}>
            <p className="text-sm font-black uppercase text-[#ff6b1a]">{tr('landing.pricing.eyebrow')}</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              {tr('landing.pricing.title')}
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-black/55">
              {tr('landing.pricing.subtitle')}
            </p>
            <Link href="/planes" className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#101010] px-7 text-sm font-black text-white shadow-xl shadow-black/14 transition hover:-translate-y-0.5">
              {tr('common.viewPlans')}
              <ArrowRight className="size-4" />
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="grid gap-4 md:grid-cols-3">
            {pricingPlans.map(plan => (
              <div key={plan.name} className={`landing-pricing-card rounded-[1.6rem] border p-5 shadow-sm ${plan.popular ? 'landing-pricing-card-popular border-[#ff6b1a] bg-[#fff7ed]' : 'border-black/8 bg-[#faf9f6]'}`}>
                {plan.popular && (
                  <p className="mb-3 w-fit rounded-full bg-[#ff6b1a] px-3 py-1 text-[11px] font-black uppercase text-white">
                    {tr('landing.pricing.popular')}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-lg font-black">{plan.name}</p>
                  <div className="grid size-10 place-items-center rounded-xl bg-[#101010] text-white">
                    <Layers3 className="size-4" />
                  </div>
                </div>
                <div className="mt-5">
                  <p className="text-xs font-black uppercase text-[#ffb84d]">Desde</p>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-5xl font-black leading-none tracking-tight">{plan.monthly}</span>
                    <span className="pb-1 text-xl font-black">EUR</span>
                  </div>
                  <p className="mt-1 text-sm font-black text-black/45">por restaurante / {tr('common.month')}</p>
                </div>
                <div className="landing-pricing-saving mt-4 rounded-2xl border border-[#ff6b1a]/20 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase text-[#c54a0c]">Pagando anual ahorras</p>
                  <p className="mt-1 text-lg font-black">{plan.discount.replace('Ahorra ', '')}</p>
                  <p className="text-xs font-bold text-black/45">{plan.annual.toLocaleString('es-ES')} EUR/año</p>
                </div>
                <div className="mt-5 space-y-2">
                  {plan.features.map(item => (
                    <div key={item} className="flex items-center gap-2 text-sm font-black">
                      <Check className="size-4 text-[#ff6b1a]" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="demo" className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.4rem] bg-[#101010] p-6 text-white shadow-[0_35px_120px_rgba(17,17,17,0.24)] sm:p-10 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.5fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#ffb366]">Eccofood</p>
              <h2 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                {tr('landing.cta.title')}
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-white/58">
                {tr('landing.cta.subtitle')}
              </p>
            </div>
            <Link href="/register" className="inline-flex h-16 items-center justify-center gap-2 rounded-2xl bg-[#ff6b1a] px-8 text-base font-black text-white shadow-2xl shadow-orange-950/25 transition hover:-translate-y-0.5 hover:bg-[#ed5f12]">
              {tr('common.startFreeToday')}
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/[0.06] bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <EccofoodLogo size="md" showText={false} />
              <p className="text-lg font-black">Eccofood</p>
            </div>
            <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-black/48">
              {tr('landing.footer.text')}
            </p>
          </div>
          {[
            ['Producto', ['TPV / POS', 'QR Menu', 'KDS cocina', 'Inventario']],
            ['Empresa', ['Soporte', 'Contacto', 'Casos de exito', 'Demo']],
            ['Legal', ['Privacidad', 'Terminos', 'Idioma ES', 'Estado']],
          ].map(([title, links]) => (
            <div key={String(title)}>
              <p className="font-black">{String(title)}</p>
              <div className="mt-4 space-y-3">
                {(links as string[]).map(link => (
                  <a key={link} href={footerHref(link)} className="block text-sm font-bold text-black/45 transition hover:text-black">{link}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  )
}
