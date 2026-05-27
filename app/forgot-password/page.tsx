'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Send } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({ error: 'No pudimos conectar con el servidor.' }))

      if (!response.ok) {
        setError(data.error || 'No pudimos enviar el enlace.')
        return
      }

      setSuccess(true)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="ecco-platform-page min-h-screen text-white">
      <nav className="border-b border-black/[0.06] bg-white/86 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" textClassName="text-lg font-black tracking-tight" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#111827] shadow-sm">
            <ArrowLeft className="size-4" />
            Login
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <aside className="hidden rounded-[2rem] border border-black/8 bg-[#111827] p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.20)] lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-black uppercase text-white/72">
            <Mail className="size-4 text-[#f59e0b]" />
            Recuperacion segura
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight">Vuelve a entrar sin perder el ritmo.</h1>
          <p className="mt-5 max-w-md text-base font-semibold leading-7 text-white/68">
            Enviaremos un enlace privado para crear una contrasena nueva y proteger la cuenta del restaurante.
          </p>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#D4AF37]">Recuperar acceso</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827]">Olvide mi contrasena</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Escribe el email de la cuenta y te enviaremos instrucciones.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-[0_26px_90px_rgba(15,23,42,0.10)] sm:p-8">
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Si el email existe, enviamos un enlace para cambiar la contrasena.
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
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:ring-4 focus:ring-[#D4AF37]/10"
                      placeholder="tu@restaurante.com"
                    />
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D35A37] text-sm font-black text-white shadow-[0_18px_42px_rgba(230,95,26,0.18)] transition hover:-translate-y-0.5 hover:bg-[#bd4d31] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                  {!loading && <Send className="size-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
