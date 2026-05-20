'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import EccofoodLogo from '@/components/EccofoodLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChefHat,
  CreditCard,
  Layers3,
  LineChart,
  MonitorSmartphone,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react'

const modules = [
  {
    icon: QrCode,
    title: 'Carta QR y pedidos directos',
    text: 'Tus clientes escanean, ven fotos, eligen extras y envian el pedido sin esperar a que el equipo este libre.',
  },
  {
    icon: ReceiptText,
    title: 'TPV, caja y comandero',
    text: 'Ventas, mesas, tickets, descuentos, empleados y comandas conectadas en un flujo rapido para el dia a dia.',
  },
  {
    icon: ChefHat,
    title: 'KDS para cocina',
    text: 'La cocina recibe todo ordenado por prioridad, con estados claros y menos errores en horas de alta demanda.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Kiosko y pagina web',
    text: 'Autoservicio, tienda online, banners y promociones para vender mas desde tus propios canales.',
  },
]

const metrics = [
  { value: '30', label: 'dias gratis', detail: 'sin permanencia mensual' },
  { value: '0%', label: 'comision propia', detail: 'vende desde tu canal' },
  { value: '1', label: 'operacion conectada', detail: 'TPV, QR, KDS y web' },
]

const plans = [
  {
    id: 'basic',
    name: 'Basic',
    price: '49.99',
    annual: '539.89',
    saving: '60 EUR',
    description: 'Para empezar a digitalizar la operacion.',
    features: ['Carta QR incluida', 'TPV / POS', 'Comandero', 'KDS cocina'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '99.99',
    annual: '1079.89',
    saving: '120 EUR',
    description: 'Para vender en sala, web y autoservicio.',
    features: ['Todo Basic', 'Pagina web', 'Kiosko autoservicio', 'Pedidos online'],
    featured: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '299.99',
    annual: '3239.89',
    saving: '360 EUR',
    description: 'Para marcas que quieren una experiencia exclusiva.',
    features: ['Todas las funciones', 'Disenos exclusivos por cliente', 'Acompanamiento premium', 'Configuracion avanzada'],
  },
]

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] },
  }
}

function GoldBadge({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-[#1A1F2C]/80 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#D4AF37] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
      <Star className="size-4 fill-[#D4AF37] text-[#D4AF37]" />
      {children}
    </div>
  )
}

function ImagePanel({
  src,
  alt,
  label,
  className = '',
}: {
  src: string
  alt: string
  label: string
  className?: string
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[2rem] border border-[#D4AF37]/22 bg-[#111722] shadow-[0_35px_110px_rgba(0,0,0,0.34)] ${className}`}>
      <Image src={src} alt={alt} fill className="object-cover transition duration-700 group-hover:scale-[1.03]" sizes="(max-width: 1024px) 100vw, 50vw" priority={src.includes('restaurant-platform')} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,14,20,0.10)_0%,rgba(11,14,20,0.18)_40%,rgba(11,14,20,0.74)_100%)]" />
      <div className="absolute left-5 top-5 rounded-full border border-[#D4AF37]/35 bg-[#0B0E14]/65 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37] backdrop-blur-md">
        {label}
      </div>
    </div>
  )
}

export function EccofoodLanding() {
  return (
    <main className="ecco-landing-jewel min-h-screen overflow-x-hidden bg-[#0B0E14] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0B0E14]/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <EccofoodLogo size="md" showText={false} />
            <p className="hidden text-xl font-black tracking-tight text-white min-[520px]:block sm:block">Eccofood</p>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-bold text-white/58 lg:flex">
            <a href="#funciones" className="transition hover:text-white">Funciones</a>
            <a href="#operacion" className="transition hover:text-white">Operacion</a>
            <a href="#precios" className="transition hover:text-white">Precios</a>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher compact className="hidden border-white/10 bg-white/8 text-white sm:inline-flex" />
            <Link href="/login" className="inline-flex rounded-full border border-[#D4AF37]/45 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-[#0B0E14] sm:px-5 sm:text-sm">
              Entrar
            </Link>
            <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/55 bg-transparent px-3 py-2.5 text-xs font-black text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-[#0B0E14] sm:gap-2 sm:px-5 sm:text-sm">
              Gratis
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pb-18 pt-12 sm:px-6 lg:pb-24 lg:pt-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(212,175,55,0.16),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(211,90,55,0.10),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />

        <div className="relative mx-auto max-w-7xl">
          <div className="relative min-h-[660px] overflow-hidden rounded-[2.2rem] border border-[#D4AF37]/24 bg-[#1A1F2C] shadow-[0_40px_140px_rgba(0,0,0,0.45)]">
            <Image
              src="/landing/eccofood-restaurant-platform-hero.png"
              alt="Restaurante moderno usando Eccofood con TPV, carta QR, web y kiosko"
              fill
              className="object-cover object-center opacity-72"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,14,20,0.84)_0%,rgba(11,14,20,0.58)_45%,rgba(11,14,20,0.26)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_38%_28%,rgba(212,175,55,0.18),transparent_30%)]" />

            <motion.div {...fadeUp()} className="relative z-10 flex min-h-[660px] max-w-4xl flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
              <GoldBadge>30 dias gratis · Sin permanencia mensual</GoldBadge>

              <h1 className="mt-8 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight text-white sm:text-6xl lg:text-7xl">
                La app que convierte tu restaurante en una
                <span className="block bg-[linear-gradient(90deg,#D4AF37,#fff3c4,#C5A880)] bg-clip-text text-transparent">
                  maquina de vender
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-[#d9d1bf]/82 sm:text-lg">
                Eccofood une carta QR, tienda online, TPV, comandero, KDS, kiosko, reservas e inventario para vender mas y controlar mejor cada pedido.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#D35A37] px-7 text-sm font-black text-white shadow-[0_18px_46px_rgba(211,90,55,0.34)] transition hover:-translate-y-0.5 hover:bg-[#c84f2f]">
                  Crear mi restaurante
                  <ArrowRight className="size-4" />
                </Link>
                <Link href="/planes" className="inline-flex h-14 items-center justify-center rounded-2xl border border-[#D4AF37]/35 bg-[#0B0E14]/34 px-7 text-sm font-black text-[#D4AF37] backdrop-blur-md transition hover:bg-[#D4AF37] hover:text-[#0B0E14]">
                  Ver planes
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {metrics.map((metric, index) => (
            <motion.article key={metric.label} {...fadeUp(index * 0.06)} className="rounded-[1.6rem] border border-[#D4AF37]/18 bg-[#1A1F2C]/66 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <p className="text-5xl font-black tracking-tight text-[#D4AF37]">{metric.value}</p>
              <h3 className="mt-4 text-lg font-black text-white">{metric.label}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#5E6E82]">{metric.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="funciones" className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D4AF37]">Todo conectado</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Un sistema completo para vender, operar y controlar.
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-[#5E6E82]">
              La landing debe mostrar que Eccofood no es solo una carta digital: es el centro operativo del restaurante.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-4">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <motion.article key={module.title} {...fadeUp(index * 0.06)} className="rounded-[1.6rem] border border-white/8 bg-[#1A1F2C]/70 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:border-[#D4AF37]/34">
                  <div className="grid size-13 place-items-center rounded-2xl border border-[#D4AF37]/35 bg-[#0B0E14] text-[#D4AF37]">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-black leading-tight text-white">{module.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-[#8b97a8]">{module.text}</p>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section id="operacion" className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <motion.div {...fadeUp()} className="space-y-5">
            <ImagePanel
              src="/landing/eccofood-kitchen-operations.png"
              alt="Equipo de cocina y sala usando Eccofood"
              label="Operacion real"
              className="h-[520px]"
            />
          </motion.div>

          <motion.div {...fadeUp(0.08)} className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/78 p-7 shadow-[0_30px_110px_rgba(0,0,0,0.26)] sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D4AF37]">Como lo vendemos</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              No vendemos pantallas. Vendemos mas control, menos caos y mas pedidos.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-[#8b97a8]">
              El mensaje comercial tiene que ser claro: Eccofood ayuda al dueno a vender por sus propios canales, ordenar la cocina y ver que esta pasando en caja, inventario y clientes.
            </p>

            <div className="mt-8 space-y-4">
              {[
                ['Vender mas', 'QR, web, kiosko y delivery propio para recibir pedidos directos.'],
                ['Operar mejor', 'TPV, comandero y KDS sincronizados para sala y cocina.'],
                ['Decidir con datos', 'Ventas, cierres, inventario y productos top en tiempo real.'],
              ].map(([title, text]) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-[#0B0E14]/55 p-4">
                  <span className="mt-1 grid size-8 flex-shrink-0 place-items-center rounded-full bg-[#D35A37] text-white">
                    <Check className="size-4" />
                  </span>
                  <div>
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#8b97a8]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center">
          <motion.div {...fadeUp()} className="rounded-[2rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/78 p-7 sm:p-9">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D4AF37]">Punto de venta premium</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Un TPV rapido para vender mas sin cansar al equipo.
            </h2>
            <p className="mt-5 text-base font-semibold leading-8 text-[#8b97a8]">
              Eccofood organiza productos, mesas, caja, pedidos y cobros en una pantalla clara. El cajero trabaja mas rapido y el dueno mantiene el control de cada venta.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                [ShieldCheck, 'Confianza visual'],
                [CreditCard, 'Cobros y caja'],
                [LineChart, 'Reportes claros'],
                [CalendarCheck, 'Reservas y clientes'],
              ].map(([Icon, label]) => {
                const Component = Icon as typeof ShieldCheck
                return (
                  <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-[#0B0E14]/50 p-4">
                    <Component className="size-5 text-[#D4AF37]" />
                    <span className="text-sm font-black text-white">{String(label)}</span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.08)} className="relative">
            <div className="absolute -inset-6 rounded-[3rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative mx-auto max-w-[440px] overflow-hidden rounded-[2.2rem] border border-[#D4AF37]/24 bg-[#0B0E14] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.40)]">
              <Image
                src="/landing/eccofood-pos-premium.png"
                alt="Interfaz premium de punto de venta Eccofood"
                width={852}
                height={1846}
                className="rounded-[1.65rem]"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section id="precios" className="px-4 py-18 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp()} className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D4AF37]">Planes</p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Precios simples para empezar y crecer.
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-[#5E6E82]">
              Todos los planes incluyen carta QR. El cliente puede probar 30 dias y luego elegir el plan que necesita.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {plans.map(plan => (
              <motion.article key={plan.name} {...fadeUp(plan.featured ? 0.08 : 0)} className={`rounded-[1.8rem] border p-6 shadow-[0_28px_100px_rgba(0,0,0,0.22)] ${plan.featured ? 'border-[#D4AF37]/55 bg-[#D4AF37]/10' : 'border-white/8 bg-[#1A1F2C]/70'}`}>
                {plan.featured && (
                  <p className="mb-4 w-fit rounded-full bg-[#D4AF37] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#0B0E14]">Mas elegido</p>
                )}
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-white">{plan.name}</h3>
                  <Layers3 className="size-5 text-[#D4AF37]" />
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#8b97a8]">{plan.description}</p>
                <div className="mt-7 flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tight text-white">{plan.price}</span>
                  <span className="pb-1 text-sm font-black uppercase text-[#D4AF37]">EUR / mes</span>
                </div>
                <div className="mt-5 rounded-2xl border border-[#D4AF37]/24 bg-[#0B0E14]/45 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">Pago anual con descuento</p>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <p className="text-2xl font-black text-white">{plan.annual} EUR</p>
                    <span className="rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-black text-[#0B0E14]">
                      Ahorra {plan.saving}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#8b97a8]">Equivale a 10% menos pagando el ano completo.</p>
                </div>
                <div className="mt-7 space-y-3">
                  {plan.features.map(feature => (
                    <div key={feature} className="flex items-center gap-3 text-sm font-bold text-white/82">
                      <Check className="size-4 text-[#D4AF37]" />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="mt-8 grid gap-3">
                  <Link href={`/register?plan=${plan.id}`} className={`inline-flex h-13 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black transition hover:-translate-y-0.5 ${plan.featured ? 'bg-[#D35A37] text-white shadow-[0_18px_46px_rgba(211,90,55,0.28)]' : 'bg-white text-[#0B0E14]'}`}>
                    Suscribirme mensual
                    <ArrowRight className="size-4" />
                  </Link>
                  <Link href={`/register?plan=${plan.id}&billing=year`} className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#D4AF37]/35 bg-transparent px-5 text-sm font-black text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-[#0B0E14]">
                    Suscribirme anual con descuento
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-18 sm:px-6 lg:py-24">
        <motion.div {...fadeUp()} className="mx-auto max-w-7xl overflow-hidden rounded-[2.4rem] border border-[#D4AF37]/24 bg-[#1A1F2C] p-8 text-center shadow-[0_40px_130px_rgba(0,0,0,0.34)] sm:p-12">
          <Sparkles className="mx-auto size-10 text-[#D4AF37]" />
          <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Empieza con 30 dias gratis y convierte tu restaurante en una operacion digital.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base font-semibold leading-7 text-[#8b97a8]">
            Prueba TPV, QR, comandero, KDS, tienda y panel sin permanencia mensual.
          </p>
          <div className="mt-8">
            <Link href="/register" className="inline-flex h-[60px] items-center justify-center gap-2 rounded-2xl bg-[#D35A37] px-8 text-base font-black text-white shadow-[0_18px_46px_rgba(211,90,55,0.34)] transition hover:-translate-y-0.5">
              Crear mi restaurante
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/8 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <EccofoodLogo size="md" showText={false} />
            <div>
              <p className="text-lg font-black text-white">Eccofood</p>
              <p className="text-sm font-semibold text-[#5E6E82]">Software premium para restaurantes.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-[#8b97a8]">
            <Link href="/soporte" className="hover:text-white">Soporte</Link>
            <Link href="/planes" className="hover:text-white">Planes</Link>
            <Link href="/login" className="hover:text-white">Entrar</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
