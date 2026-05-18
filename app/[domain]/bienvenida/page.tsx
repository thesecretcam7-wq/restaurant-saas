import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BadgeCheck, ChefHat, ClipboardList, MonitorPlay, ShoppingBag, Store, UserRound } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { deriveBrandPalette } from '@/lib/brand-colors'

interface Props {
  params: Promise<{ domain: string }>
  searchParams: Promise<{ nuevo?: string; demo?: string }>
}

const demoAccess = [
  {
    title: 'Admin demo',
    role: 'Administrador',
    pin: '000000',
    href: 'admin',
    icon: Store,
  },
  {
    title: 'Caja demo',
    role: 'Cajero',
    pin: '999999',
    href: 'pos',
    icon: ShoppingBag,
  },
  {
    title: 'Mesero demo',
    role: 'Camarero',
    pin: '123456',
    href: 'portal/camarero',
    icon: UserRound,
  },
  {
    title: 'Cocina demo',
    role: 'Cocinero',
    pin: '567890',
    href: 'kds',
    icon: ChefHat,
  },
]

export default async function BienvenidaPage({ params, searchParams }: Props) {
  const { domain } = await params
  const { demo } = await searchParams
  const authSupabase = await createClient()
  const { data: { user } } = await authSupabase.auth.getUser()

  if (!user) redirect('/login')

  const supabase = createServiceClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, slug, organization_name, owner_id, logo_url, metadata')
    .eq('slug', domain)
    .maybeSingle()

  if (!tenant) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050403] px-6 text-[#FFF4D8]">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-black">Restaurante no encontrado</h1>
          <p className="mt-2 text-sm font-semibold text-[#B9A989]">No pudimos cargar la bienvenida.</p>
        </div>
      </main>
    )
  }

  if (tenant.owner_id !== user.id) redirect(`/${domain}/unauthorized`)

  const { data: branding } = await supabase
    .from('tenant_branding')
    .select('app_name, logo_url, primary_color, secondary_color, accent_color, background_color, button_primary_color, text_primary_color, text_secondary_color, border_color')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const palette = deriveBrandPalette({
    primary: branding?.primary_color,
    secondary: branding?.secondary_color,
    accent: branding?.accent_color,
    background: branding?.background_color,
    buttonPrimary: branding?.button_primary_color,
    textPrimary: branding?.text_primary_color,
    textSecondary: branding?.text_secondary_color,
    border: branding?.border_color,
  })
  const appName = branding?.app_name || tenant.organization_name
  const logoUrl = branding?.logo_url || tenant.logo_url
  const demoSlug = demo || `demo-${tenant.id.substring(0, 8)}`

  return (
    <main
      className="min-h-screen overflow-hidden px-4 py-6 text-[#FFF4D8] sm:px-6 lg:px-8"
      style={{
        background:
          `radial-gradient(circle at 18% 10%, ${palette.accent}33 0%, transparent 28rem), ` +
          `linear-gradient(135deg, ${palette.background} 0%, ${palette.surface} 48%, #050403 100%)`,
      }}
    >
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-12 max-w-32 object-contain" />
            ) : (
              <span className="grid size-12 place-items-center rounded-2xl text-xl font-black" style={{ backgroundColor: palette.accent, color: '#15130f' }}>
                {appName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{appName}</p>
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: palette.accent }}>Bienvenida</p>
            </div>
          </div>
          <Link href={`/${tenant.slug}/acceso`} className="hidden rounded-xl border border-white/12 bg-white/8 px-4 py-2 text-sm font-black text-white transition hover:bg-white/12 sm:inline-flex">
            Ir al acceso
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]" style={{ color: palette.accent }}>
              <BadgeCheck className="size-4" />
              Cuenta creada
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.94] tracking-tight sm:text-6xl">
              Tu restaurante ya esta listo para probar Eccofood.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7" style={{ color: palette.mutedText }}>
              Te dejamos un restaurante demo con usuarios preparados para que pruebes panel, caja, mesero y cocina sin tocar la configuracion real.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={`/${tenant.slug}/admin/dashboard`} className="inline-flex h-13 items-center justify-center rounded-2xl px-6 text-sm font-black shadow-2xl transition hover:-translate-y-0.5" style={{ backgroundColor: palette.buttonPrimary, color: '#15130f' }}>
                Entrar a mi panel real
              </Link>
              <Link href={`/${demoSlug}/acceso`} className="inline-flex h-13 items-center justify-center rounded-2xl border border-white/14 bg-white/8 px-6 text-sm font-black text-white transition hover:bg-white/12">
                Probar restaurante demo
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: palette.accent }}>Usuarios demo</p>
                <h2 className="mt-2 text-2xl font-black">PINs para probar</h2>
              </div>
              <MonitorPlay className="size-7" style={{ color: palette.accent }} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {demoAccess.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.title}
                    href={`/${demoSlug}/acceso/login/${item.href}`}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:bg-black/28"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-11 place-items-center rounded-xl" style={{ backgroundColor: `${palette.accent}22`, color: palette.accent }}>
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <p className="font-black">{item.title}</p>
                        <p className="text-xs font-bold" style={{ color: palette.mutedText }}>{item.role}</p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-white/10 bg-white/8 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: palette.mutedText }}>Contrasena / PIN</p>
                      <p className="mt-1 font-mono text-2xl font-black tracking-[0.2em]" style={{ color: palette.accent }}>{item.pin}</p>
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-3">
                <ClipboardList className="mt-1 size-5 flex-shrink-0" style={{ color: palette.accent }} />
                <p className="text-sm font-semibold leading-6" style={{ color: palette.mutedText }}>
                  Esta pantalla aparece justo despues del registro para que puedas probar la app rapido. Tu restaurante real queda separado del demo.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
