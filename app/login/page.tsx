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
    <main className="ecco-platform-page min-h-screen overflow-hidden text-white">
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#0B0E14] pl-10 pr-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/10"
                      placeholder="tu@restaurante.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-slate-500">Contrasena</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#0B0E14] pl-10 pr-11 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:bg-white focus:ring-4 focus:ring-[#D4AF37]/10"
                      placeholder="Tu contrasena"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-black/5 hover:text-[#111827]" aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D35A37] text-sm font-black text-white shadow-[0_18px_42px_rgba(230,95,26,0.18)] transition hover:-translate-y-0.5 hover:bg-[#bd4d31] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-semibold">O continua con</span>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  try {
                    setLoading(true)
                    const { signInWithGoogle } = await import('@/lib/supabase/client')
                    await signInWithGoogle()
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : 'Error al iniciar sesion con Google')
                    setLoading(false)
                  }
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-[#111827] shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Conectando...' : 'Continuar con Google'}
              </button>
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
