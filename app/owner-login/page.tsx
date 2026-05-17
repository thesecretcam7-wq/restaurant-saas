'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'

export default function OwnerLoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => ({ error: 'No pudimos conectar con el servidor.' }))

      if (!response.ok) {
        setError(data.error || 'Email o contrasena incorrectos')
        return
      }

      if (data.redirectUrl !== '/owner-dashboard') {
        setError('Este acceso es solo para el dueno de Eccofood.')
        return
      }

      router.push('/owner-dashboard')
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] text-[#fff7df]">
      <nav className="border-b border-[#ffc247]/15 bg-[#080808]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" textClassName="text-lg font-black tracking-tight" />
          </Link>
          <Link href="/login" className="rounded-full border border-[#ffc247]/18 px-4 py-2 text-sm font-black text-[#ffd66b]">
            Login restaurantes
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <aside className="hidden rounded-[2rem] border border-[#ffc247]/18 bg-white/[0.06] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.42)] lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ffc247]/24 bg-[#ffc247]/10 px-3 py-1.5 text-xs font-black uppercase text-[#ffd66b]">
            <ShieldCheck className="size-4" />
            Acceso propietario
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight">Panel privado del dueno de Eccofood.</h1>
          <p className="mt-5 max-w-md text-base font-semibold leading-7 text-[#f8f5ec]/70">
            Este acceso no entra a ninguna tienda. Es solo para controlar clientes, planes, cuentas manuales, ingresos y soporte de la plataforma.
          </p>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#ff8a2a]">Eccofood interno</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">Entrar como dueno</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#f8f5ec]/70">
                Usa tu correo autorizado para abrir el panel separado de las tiendas.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-[#ffc247]/18 bg-white/[0.07] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8">
              {error && (
                <div className="mb-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-100">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase text-[#ffd66b]/76">Email del dueno</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#ffd66b]/55" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
                      className="h-12 w-full rounded-xl border border-[#ffc247]/18 bg-white/[0.075] pl-10 pr-4 text-sm font-bold text-[#fff7df] outline-none placeholder:text-[#f8f5ec]/36 focus:border-[#f6b92f]"
                      placeholder="tu@email.com"
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
                      onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                      className="h-12 w-full rounded-xl border border-[#ffc247]/18 bg-white/[0.075] pl-10 pr-11 text-sm font-bold text-[#fff7df] outline-none placeholder:text-[#f8f5ec]/36 focus:border-[#f6b92f]"
                      placeholder="Tu contrasena"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(value => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#f8f5ec]/50 transition hover:bg-white/10 hover:text-[#ffd66b]"
                      aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                    >
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f6b92f] text-sm font-black text-[#080808] shadow-[0_18px_42px_rgba(246,185,47,0.24)] transition hover:-translate-y-0.5 disabled:opacity-60"
                >
                  {loading ? 'Entrando...' : 'Entrar al panel privado'}
                  {!loading && <ArrowRight className="size-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
