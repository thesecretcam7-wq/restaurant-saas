'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import EccofoodLogo from '@/components/EccofoodLogo'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ password: '', confirmPassword: '' })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session))
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (form.password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Las contrasenas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: form.password,
      })

      if (updateError) {
        setError(updateError.message || 'No pudimos actualizar la contrasena.')
        return
      }

      await supabase.auth.signOut()
      setSuccess(true)
      setForm({ password: '', confirmPassword: '' })
      window.setTimeout(() => {
        window.location.href = '/login'
      }, 1800)
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
          <Link href="/login" className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-black text-[#111827] shadow-sm">
            Login
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
        <aside className="hidden rounded-[2rem] border border-black/8 bg-[#111827] p-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.20)] lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs font-black uppercase text-white/72">
            <ShieldCheck className="size-4 text-[#f59e0b]" />
            Nueva contrasena
          </div>
          <h1 className="mt-8 text-5xl font-black leading-tight">Crea una llave nueva para tu cuenta.</h1>
          <p className="mt-5 max-w-md text-base font-semibold leading-7 text-white/68">
            Usa una contrasena fuerte. Al guardarla, cerraremos la sesion temporal y volveras al login.
          </p>
        </aside>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-black uppercase text-[#D4AF37]">Restablecer acceso</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight text-[#111827]">Nueva contrasena</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Escribe y confirma tu nueva contrasena.
              </p>
            </div>

            <div className="rounded-[1.6rem] border border-black/8 bg-white p-6 shadow-[0_26px_90px_rgba(15,23,42,0.10)] sm:p-8">
              {checking ? (
                <div className="py-8 text-center text-sm font-bold text-slate-600">Verificando enlace...</div>
              ) : !hasSession ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    Este enlace no esta activo o ya fue utilizado.
                  </div>
                  <Link href="/forgot-password" className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#D35A37] text-sm font-black text-white">
                    Pedir otro enlace
                  </Link>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                      Contrasena actualizada. Te llevamos al login.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase text-slate-500">Nueva contrasena</span>
                      <span className="relative block">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={form.password}
                          onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:ring-4 focus:ring-[#D4AF37]/10"
                          placeholder="Minimo 8 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(value => !value)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-black/5 hover:text-[#111827]"
                          aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        >
                          {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </span>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-black uppercase text-slate-500">Confirmar contrasena</span>
                      <span className="relative block">
                        <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={form.confirmPassword}
                          onChange={event => setForm(prev => ({ ...prev, confirmPassword: event.target.value }))}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-bold text-[#111827] outline-none transition placeholder:text-slate-400 focus:border-[#D35A37] focus:ring-4 focus:ring-[#D4AF37]/10"
                          placeholder="Repite la contrasena"
                        />
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={loading || success}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#D35A37] text-sm font-black text-white shadow-[0_18px_42px_rgba(230,95,26,0.18)] transition hover:-translate-y-0.5 hover:bg-[#bd4d31] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Guardando...' : 'Guardar contrasena'}
                      {!loading && <ArrowRight className="size-4" />}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
