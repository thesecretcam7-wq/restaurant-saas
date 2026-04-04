'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Email o contraseña incorrectos'); return }
      router.push(`/${data.tenant.slug}/admin/dashboard`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)' }} />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)' }} />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <span className="text-white text-sm font-black">R</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Restaurant<span className="text-[#F97316]">SaaS</span></span>
        </Link>
        <Link href="/register" className="text-sm text-white/60 hover:text-white transition-colors">
          ¿Sin cuenta? <span className="text-[#F97316] font-medium">Regístrate gratis</span>
        </Link>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F97316]/20 bg-[#F97316]/5 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
              <span className="text-xs text-[#F97316] font-medium">Panel de administración</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-2 leading-tight">
              Bienvenido de<br />
              <span style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                vuelta
              </span>
            </h1>
            <p className="text-white/50 text-sm">Accede al panel de tu restaurante</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-white/[0.08] p-8" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/30 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                  placeholder="tu@restaurante.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/30 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{ background: loading ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #F97316, #EA580C)', color: '#fff', boxShadow: loading ? 'none' : '0 0 24px rgba(249,115,22,0.3)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </form>
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-white/40 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#F97316] hover:text-[#FB923C] font-medium transition-colors">
              Crea tu restaurante gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom credits */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-xs text-white/20">© 2026 RestaurantSaaS — Todos los derechos reservados</p>
      </div>
    </div>
  )
}
