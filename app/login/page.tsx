'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({
        error: 'No pudimos conectar con el servidor. Revisa internet e intenta de nuevo.',
      }))
      if (!res.ok) {
        setError(data.error || 'Email o contrasena incorrectos')
        return
      }
      router.push(data.redirectUrl || `/${data.tenant.slug}/acceso`)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ecco-premium-app min-h-screen overflow-hidden text-[#f8f5ec]">
      <nav className="border-b border-[#ffc247]/15 bg-[#070707]/72 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" textClassName="text-lg font-black tracking-tight" />
          </Link>
          <Link href="/register" className="rounded-full border border-[#ffc247]/18 bg-white/[0.06] px-4 py-2 text-sm font-black text-[#ffd66b] transition hover:border-[#ffc247]/38 hover:bg-white/[0.10]">
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="pointer-events-none absolute left-1/2 top-8 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(246,185,47,0.16),transparent_64%)] blur-2xl" />
        <aside className="hidden flex-col justify-between rounded-[2rem] border border-[#ffc247]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035)),rgba(12,12,12,0.88)] p-8 text-white shadow-[0_30px_100px_rgba(0,0,0,0.42),0_0_70px_rgba(249,115,22,0.14)] backdrop-blur-2xl lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc247]/24 bg-[#ffc247]/10 px-3 py-1.5 text-xs font-black uppercase text-[#ffd66b] shadow-[0_0_22px_rgba(246,185,47,0.12)]">
              <ShieldCheck className="size-4 text-[#ffd66b]" />
              Acceso seguro
            </div>
            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight text-[#fff7df]">Vuelve al centro de control.</h1>
            <p className="mt-5 max-w-md text-base font-semibold leading-7 text-[#f8f5ec]/72">
              Gestiona pedidos, POS, cocina, reservas, productos, staff y ventas desde una interfaz preparada para trabajar rapido.
            </p>
          </div>
          <div className="grid gap-3">
            {['Panel multi restaurante', 'Roles y permisos', 'Datos protegidos'].map((item) => (
              <div key={item} className="rounded-xl border border-[#ffc247]/14 bg-white/[0.065] px-4 py-3 text-sm font-black text-[#f8f5ec]/86">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#ff8a2a]">Panel de administracion</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#fff7df]">Inicia sesion</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#f8f5ec]/70">Accede al restaurante y continua donde lo dejaste.</p>
            </div>

            <div className="rounded-[1.6rem] border border-[#ffc247]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035)),rgba(15,15,15,0.88)] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
              {error && (
                <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#ffd66b]/76">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#ffd66b]/55" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-[#ffc247]/18 bg-white/[0.075] pl-10 pr-4 text-sm font-bold text-[#fff7df] outline-none transition placeholder:text-[#f8f5ec]/36 focus:border-[#f6b92f] focus:bg-white/[0.10] focus:ring-4 focus:ring-[#f6b92f]/14"
                      placeholder="tu@restaurante.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#ffd66b]/76">Contrasena</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#ffd66b]/55" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-[#ffc247]/18 bg-white/[0.075] pl-10 pr-11 text-sm font-bold text-[#fff7df] outline-none transition placeholder:text-[#f8f5ec]/36 focus:border-[#f6b92f] focus:bg-white/[0.10] focus:ring-4 focus:ring-[#f6b92f]/14"
                      placeholder="Tu contrasena"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#f8f5ec]/50 transition hover:bg-white/10 hover:text-[#ffd66b]" aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#9b5f08,#f6b92f,#c47b10)] text-sm font-black text-[#080808] shadow-[0_18px_42px_rgba(246,185,47,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(246,185,47,0.30)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm font-semibold text-[#f8f5ec]/68">
              No tienes cuenta?{' '}
              <Link href="/register" className="font-black text-[#ffd66b] hover:text-[#ffbf47]">
                Crea tu restaurante gratis
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
