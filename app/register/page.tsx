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
    if (form.password !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
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
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al registrar'); return }
      router.push(`/${data.tenant.slug}/admin/dashboard`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: '🚀', text: 'Lista en minutos, sin código' },
    { icon: '💳', text: 'Pagos directos a tu cuenta' },
    { icon: '📱', text: 'App móvil para tus clientes' },
    { icon: '🎨', text: '100% personalizable' },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[20%] w-[500px] h-[500px] rounded-full opacity-[0.07]" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)' }} />
        <div className="absolute bottom-[10%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]" style={{ background: 'radial-gradient(circle, #F97316, transparent 70%)' }} />
      </div>

      {/* Left panel — only on large screens */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between p-12 relative z-10 border-r border-white/[0.06]">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <span className="text-white text-base font-black">R</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Restaurant<span className="text-[#F97316]">SaaS</span></span>
        </Link>

        {/* Hero copy */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#F97316]/20 bg-[#F97316]/5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316] animate-pulse" />
            <span className="text-xs text-[#F97316] font-medium">14 días gratis, sin tarjeta</span>
          </div>

          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Tu restaurante online<br />
            <span style={{ background: 'linear-gradient(90deg, #F97316, #FB923C)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              en 3 minutos
            </span>
          </h2>
          <p className="text-white/50 text-base leading-relaxed mb-10">
            Menú digital, pedidos online, reservas y pagos integrados. Todo en un solo lugar.
          </p>

          <div className="space-y-3.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: 'rgba(249,115,22,0.1)' }}>
                  {f.icon}
                </span>
                <span className="text-white/70 text-sm font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div className="p-5 rounded-2xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="flex gap-0.5 mb-3">
            {[1,2,3,4,5].map(s => <span key={s} className="text-[#F97316]">★</span>)}
          </div>
          <p className="text-white/60 text-sm leading-relaxed italic mb-3">
            &ldquo;Duplicamos los pedidos en el primer mes. La plataforma es increíblemente fácil de usar.&rdquo;
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>CM</div>
            <div>
              <p className="text-white text-xs font-semibold">Carlos M.</p>
              <p className="text-white/40 text-xs">Pizzería Roma, Bogotá</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Mobile nav */}
        <nav className="lg:hidden px-6 py-5 flex items-center justify-between border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              <span className="text-white text-sm font-black">R</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">Restaurant<span className="text-[#F97316]">SaaS</span></span>
          </Link>
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
            <span className="text-[#F97316] font-medium">Iniciar sesión</span>
          </Link>
        </nav>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[440px]">
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl font-black text-white mb-1.5">Crea tu cuenta gratis</h1>
              <p className="text-white/50 text-sm">Sin tarjeta de crédito · 14 días de prueba</p>
            </div>

            {/* Card */}
            <div className="rounded-2xl border border-white/[0.08] p-7" style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}>

              {error && (
                <div className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Row: restaurant + owner */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Restaurante *</label>
                    <input
                      type="text"
                      required
                      value={form.restaurantName}
                      onChange={e => setForm(f => ({ ...f, restaurantName: e.target.value }))}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/25 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                      placeholder="Pizzería Roma"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Tu nombre</label>
                    <input
                      type="text"
                      value={form.ownerName}
                      onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))}
                      className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/25 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                      placeholder="Carlos Martínez"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3.5 py-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/25 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                    placeholder="carlos@restaurante.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      className="w-full px-3.5 py-3 pr-11 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-white/25 text-sm outline-none transition-all focus:border-[#F97316]/50 focus:bg-white/[0.08]"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showPass
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Confirmar contraseña *</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={form.confirmPassword}
                      onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                      className={`w-full px-3.5 py-3 pr-11 rounded-xl bg-white/[0.06] border text-white placeholder-white/25 text-sm outline-none transition-all focus:bg-white/[0.08] ${
                        form.confirmPassword && form.password !== form.confirmPassword
                          ? 'border-red-500/50 focus:border-red-500/70'
                          : form.confirmPassword && form.password === form.confirmPassword
                            ? 'border-green-500/50 focus:border-green-500/70'
                            : 'border-white/[0.10] focus:border-[#F97316]/50'
                      }`}
                      placeholder="Repite la contraseña"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                      {showConfirm
                        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  {form.confirmPassword && form.password !== form.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                  style={{
                    background: loading ? 'rgba(249,115,22,0.5)' : 'linear-gradient(135deg, #F97316, #EA580C)',
                    boxShadow: loading ? 'none' : '0 0 28px rgba(249,115,22,0.3)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando tu restaurante...
                    </span>
                  ) : 'Crear restaurante gratis →'}
                </button>

                {/* Terms */}
                <p className="text-center text-xs text-white/25 leading-relaxed">
                  Al registrarte aceptas nuestros{' '}
                  <span className="text-white/40 underline cursor-pointer">Términos de servicio</span>{' '}
                  y{' '}
                  <span className="text-white/40 underline cursor-pointer">Política de privacidad</span>
                </p>
              </form>
            </div>

            {/* Footer link */}
            <p className="text-center text-sm text-white/40 mt-5">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[#F97316] hover:text-[#FB923C] font-medium transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
