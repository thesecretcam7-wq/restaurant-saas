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
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ef_48%,#f2f4f7_100%)] text-[#111827]">
      <nav className="border-b border-black/[0.06] bg-white/86 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" textClassName="text-lg font-black tracking-tight" />
          </Link>
          <Link href="/register" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#111827] shadow-sm transition hover:border-[#e65f1a]/30 hover:text-[#b74710]">
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
              <p className="text-sm font-black uppercase text-[#b74710]">Panel de administracion</p>
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfaf7] pl-10 pr-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#e65f1a] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
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
                      className="h-12 w-full rounded-xl border border-slate-200 bg-[#fbfaf7] pl-10 pr-11 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#e65f1a] focus:bg-white focus:ring-4 focus:ring-orange-500/10"
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
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e65f1a] text-sm font-black text-white shadow-[0_18px_42px_rgba(230,95,26,0.18)] transition hover:-translate-y-0.5 hover:bg-[#cc4f12] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm font-semibold text-slate-600">
              No tienes cuenta?{' '}
              <Link href="/register" className="font-black text-[#b74710] hover:text-[#e65f1a]">
                Crea tu restaurante gratis
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
