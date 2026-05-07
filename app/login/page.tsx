'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'

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
    <main className="min-h-screen bg-[#f7f5f0] text-[#15130f]">
      <nav className="border-b border-black/10 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#e43d30] text-sm font-black text-white">E</span>
            <span className="text-lg font-black tracking-tight">Eccofood</span>
          </Link>
          <Link href="/register" className="text-sm font-bold text-black/60 transition hover:text-black">
            Crear cuenta
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <aside className="hidden flex-col justify-between rounded-2xl bg-[#15130f] p-8 text-white shadow-2xl shadow-black/15 lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-black uppercase text-white/72">
              <ShieldCheck className="size-4 text-[#f4b860]" />
              Acceso seguro
            </div>
            <h1 className="mt-8 text-5xl font-black leading-tight tracking-tight">Vuelve al centro de control.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/62">
              Gestiona pedidos, POS, cocina, reservas, productos, staff y ventas desde una interfaz preparada para trabajar rapido.
            </p>
          </div>
          <div className="grid gap-3">
            {['Panel multi restaurante', 'Roles y permisos', 'Datos protegidos'].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/82">
                {item}
              </div>
            ))}
          </div>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#e43d30]">Panel de administracion</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Inicia sesion</h2>
              <p className="mt-3 text-sm leading-6 text-black/58">Accede al restaurante y continua donde lo dejaste.</p>
            </div>

            <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl shadow-black/5 sm:p-8">
              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-black/48">Email</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/35" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      className="h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#e43d30] focus:bg-white focus:ring-4 focus:ring-red-500/10"
                      placeholder="tu@restaurante.com"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-black/48">Contrasena</span>
                  <span className="relative block">
                    <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-black/35" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] pl-10 pr-11 text-sm font-semibold outline-none transition focus:border-[#e43d30] focus:bg-white focus:ring-4 focus:ring-red-500/10"
                      placeholder="Tu contrasena"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-black/42 transition hover:bg-black/5 hover:text-black" aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e43d30] text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:bg-[#c93228] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-sm font-semibold text-black/55">
              No tienes cuenta?{' '}
              <Link href="/register" className="text-[#e43d30] hover:text-[#b72920]">
                Crea tu restaurante gratis
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
