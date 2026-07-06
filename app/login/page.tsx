'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'
import SupportButton from '@/components/SupportButton'
import { createClient } from '@/lib/supabase/client'

const LOGIN_TIMEOUT_MS = 10000

async function fetchLoginWithTimeout(form: { email: string; password: string }) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS)

  try {
    return await fetch('/api/auth/login', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authError = params.get('error')
    if (authError) setError(authError)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    let navigating = false
    try {
      const res = await fetchLoginWithTimeout(form)
      const data = await res.json().catch(() => ({
        error: 'No pudimos conectar con el servidor. Revisa internet e intenta de nuevo.',
      }))
      if (!res.ok) {
        setError(data.error || 'Email o contrasena incorrectos')
        return
      }
      const destination = data.redirectUrl || `/${data.tenant.slug}/acceso`
      navigating = true
      router.push(destination)
      window.setTimeout(() => {
        if (window.location.pathname !== destination) {
          window.location.assign(destination)
        }
      }, 700)
    } catch (loginError) {
      const timedOut = loginError instanceof Error && loginError.name === 'AbortError'
      setError(timedOut ? 'El servidor tardo demasiado. Reintenta o entra por Acceso del personal.' : 'Error de conexion. Intenta de nuevo.')
    } finally {
      if (!navigating) setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const origin = window.location.hostname === '0.0.0.0'
        ? window.location.origin.replace('0.0.0.0', 'localhost')
        : window.location.origin
      const callbackUrl = new URL('/auth/callback', origin)
      callbackUrl.searchParams.set('next', '/login')

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setError('No pudimos abrir el inicio de sesion con Google.')
        setGoogleLoading(false)
      }
    } catch {
      setError('Error de conexion con Google. Intenta de nuevo.')
      setGoogleLoading(false)
    }
  }

  return (
    <main className="ecco-platform-page min-h-screen overflow-hidden text-white">
      <SupportButton />
      <nav className="border-b border-black/[0.06] bg-white/86 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" textClassName="text-lg font-black tracking-tight" />
          </Link>
          <Link href="/register" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#111827] shadow-sm transition hover:border-[#D35A37]/30 hover:text-[#D4AF37]">
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <div className="pointer-events-none absolute left-1/2 top-8 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(230,95,26,0.10),transparent_64%)] blur-2xl" />
        <aside className="hidden flex-col justify-between rounded-[2rem] border border-black/8 bg-[#111827] p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.20)] lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-black uppercase text-white/72">
              <ShieldCheck className="size-4 text-[#f59e0b]" />
              Acceso seguro
            </div>
            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight text-white">Vuelve al centro de control.</h1>
            <p className="mt-5 max-w-md text-base font-semibold leading-7 text-white/68">
              Gestiona pedidos, POS, cocina, reservas, productos, staff y ventas desde una interfaz preparada para trabajar rapido.
            </p>
          </div>
          <div className="grid gap-3">
            {['Panel multi restaurante', 'Roles y permisos', 'Datos protegidos'].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3 text-sm font-black text-white/86">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#D4AF37]">Panel de administracion</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827]">Inicia sesion</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">Accede al restaurante y continua donde lo dejaste.</p>
            </div>

            <div className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-[0_26px_90px_rgba(15,23,42,0.10)] sm:p-8">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
                className="mb-5 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-black text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-[#D35A37]/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="grid size-6 place-items-center rounded-full border border-slate-200 text-base font-black text-[#4285F4]">G</span>
                {googleLoading ? 'Abriendo Google...' : 'Continuar con Google'}
              </button>

              <div className="mb-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-xs font-black uppercase text-slate-400">o entra con email</span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-slate-500">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:ring-4 focus:ring-[#D4AF37]/10"
                      placeholder="tu@restaurante.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase text-slate-500">Contrasena</span>
                    <Link href="/forgot-password" className="text-xs font-black text-[#D4AF37] transition hover:text-[#D35A37]">
                      Olvide mi contrasena
                    </Link>
                  </span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:ring-4 focus:ring-[#D4AF37]/10"
                      placeholder="Tu contrasena"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-black/5 hover:text-[#111827]" aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D35A37] text-sm font-black text-white shadow-[0_18px_42px_rgba(230,95,26,0.18)] transition hover:-translate-y-0.5 hover:bg-[#bd4d31] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>

            </div>

            <p className="mt-6 text-center text-sm font-semibold text-slate-600">
              No tienes cuenta?{' '}
              <Link href="/register" className="font-black text-[#D4AF37] hover:text-[#D35A37]">
                Crea tu restaurante gratis
              </Link>
            </p>

            <p className="mt-3 text-center text-sm font-semibold text-slate-500">
              ¿Tienes algún problema?{' '}
              <Link href="/soporte" className="font-black text-slate-700 hover:text-[#D35A37]">
                Contactar soporte
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
