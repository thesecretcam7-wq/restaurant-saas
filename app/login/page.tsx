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
      router.push(data.redirectUrl || `/${data.tenant.slug}/acceso`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-gradient-to-b from-primary/20 to-secondary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-[350px] h-[350px] bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-secondary/8 rounded-full blur-3xl pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 border-b border-border bg-background/80 backdrop-blur-xl px-6 py-0 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white">E</div>
          <span className="font-bold text-lg tracking-tight text-foreground">Eccofood</span>
        </Link>
        <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ¿Sin cuenta?{' '}
          <span className="text-primary font-semibold">Regístrate gratis</span>
        </Link>
      </nav>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 relative z-10">
        <div className="w-full max-w-[420px]">

          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-6"
              style={{
                borderColor: 'var(--color-primary)',
                backgroundColor: 'var(--color-primary)',
                opacity: 0.1,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-primary)' }}
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
                Panel de administración
              </span>
            </div>
            <h1 className="text-3xl font-black text-foreground mb-2 leading-tight">
              Bienvenido a{' '}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Eccofood
              </span>
            </h1>
            <p className="text-muted-foreground text-sm">Accede al panel de administración de tu restaurante</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-lg animate-slide-up" style={{ animationDelay: '100ms' }}>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-destructive flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  placeholder="tu@restaurante.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3 pr-11 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
                className="w-full py-3.5 rounded-lg font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5"
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
          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:text-primary/80 font-semibold transition-colors">
              Crea tu restaurante gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Bottom credits */}
      <div className="relative z-10 pb-6 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Eccofood — Todos los derechos reservados</p>
      </div>
    </div>
  )
}
