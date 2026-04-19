'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validaciones del lado del cliente
    if (!form.restaurantName.trim()) {
      setError('El nombre del restaurante es requerido')
      return
    }
    if (!form.email.trim()) {
      setError('El email es requerido')
      return
    }
    if (!form.password || form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      console.log('📝 Iniciando registro con:', {
        email: form.email,
        restaurantName: form.restaurantName,
        ownerName: form.ownerName,
      })

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          restaurantName: form.restaurantName,
          ownerName: form.ownerName,
        }),
      })

      console.log('📡 Response status:', res.status)

      const data = await res.json()
      console.log('📦 Response data:', data)

      if (!res.ok) {
        const errorMsg = data.error || `Error al registrar (${res.status})`
        console.error('❌ Error:', errorMsg)
        setError(errorMsg)
        return
      }

      if (!data.tenant || !data.tenant.slug) {
        console.error('❌ Error: No se recibió tenant en la respuesta')
        setError('Error: No se creó el restaurante correctamente')
        return
      }

      console.log('✅ Registro exitoso, redirigiendo a:', `/${data.tenant.slug}/acceso`)
      router.push(`/${data.tenant.slug}/acceso`)
    } catch (error) {
      console.error('❌ Exception:', error)
      setError(`Error de conexión: ${error instanceof Error ? error.message : 'Intenta de nuevo'}`)
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    { icon: '⚡', text: 'Listo en minutos, sin configuración compleja' },
    { icon: '💳', text: 'Pagos directos a tu cuenta Stripe' },
    { icon: '📱', text: 'Tus clientes disfrutan una app profesional' },
    { icon: '🎨', text: 'Personalizable con tu marca completa' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] right-[15%] w-[500px] h-[500px] rounded-full opacity-[0.08]" style={{ background: 'radial-gradient(circle, #0066FF, transparent 70%)' }} />
        <div className="absolute bottom-[5%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #10B981, transparent 70%)' }} />
      </div>

      {/* Left panel — only on large screens */}
      <div className="hidden lg:flex lg:w-[50%] flex-col justify-between p-12 relative border-r border-border">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group animate-fade-in">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white group-hover:shadow-lg group-hover:shadow-primary/30 transition-all">
            E
          </div>
          <span className="text-foreground font-bold text-xl tracking-tight">Eccofood</span>
        </Link>

        {/* Hero copy */}
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-primary font-semibold">14 días gratis, sin tarjeta</span>
          </div>

          <h2 className="text-5xl font-black text-foreground leading-tight mb-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
            Tu restaurante prospera<br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              con Eccofood
            </span>
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '150ms' }}>
            Menú digital, pedidos online, reservas y pagos integrados. Todo con tu marca, tu dominio y sin comisiones.
          </p>

          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${200 + i * 50}ms` }}>
                <span className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 bg-primary/10">
                  {b.icon}
                </span>
                <span className="text-foreground text-sm font-medium">{b.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm animate-scale-in">
          <div className="flex gap-0.5 mb-3">
            {[1, 2, 3, 4, 5].map(s => <span key={s} className="text-secondary">★</span>)}
          </div>
          <p className="text-foreground text-sm leading-relaxed italic mb-4">
            "Duplicamos nuestros pedidos en el primer mes. Eccofood es increíblemente fácil de usar y nuestros clientes aman la experiencia."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-primary to-secondary">
              JM
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">Juan Martínez</p>
              <p className="text-muted-foreground text-xs">La Parrilla Gourmet, Madrid</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile nav */}
        <nav className="lg:hidden px-6 py-5 flex items-center justify-between border-b border-border">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-black text-white">
              E
            </div>
            <span className="text-foreground font-bold text-lg tracking-tight">Eccofood</span>
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-primary font-semibold">Iniciar sesión</span>
          </Link>
        </nav>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[440px]">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-foreground mb-2">Crea tu cuenta gratis</h1>
              <p className="text-muted-foreground">Sin tarjeta de crédito · 14 días de acceso completo</p>
            </div>

            {/* Card */}
            <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 shadow-md">

              {error && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Row: restaurant + owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Restaurante *</label>
                    <input
                      type="text"
                      required
                      value={form.restaurantName}
                      onChange={e => setForm(f => ({ ...f, restaurantName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="Pizzería Roma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tu nombre</label>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="Carlos Martínez"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="carlos@restaurante.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-4 py-2.5 pr-11 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Confirmar contraseña *</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className={`w-full px-4 py-2.5 pr-11 rounded-lg bg-background border text-foreground placeholder-muted-foreground text-sm outline-none transition-all focus:ring-2 ${
                        form.confirmPassword && form.password !== form.confirmPassword
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
                          : form.confirmPassword && form.password === form.confirmPassword
                            ? 'border-secondary/50 focus:border-secondary focus:ring-secondary/20'
                            : 'border-border focus:border-primary/50 focus:ring-primary/20'
                      }`}
                      placeholder="Repite la contraseña"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirm
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-600 text-xs mt-1.5 font-medium">Las contraseñas no coinciden</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando tu restaurante...
                    </span>
                  ) : 'Crear restaurante gratis →'}
                </button>

                {/* Terms */}
                <p className="text-center text-xs text-muted-foreground leading-relaxed">
                  Al registrarte aceptas nuestros{' '}
                  <span className="text-foreground font-medium cursor-pointer hover:underline">Términos de servicio</span>{' '}
                  y{' '}
                  <span className="text-foreground font-medium cursor-pointer hover:underline">Política de privacidad</span>
                </p>
              </form>
            </div>

            {/* Footer link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
