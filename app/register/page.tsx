'use client'

import { Suspense, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, BadgeCheck, Building2, Eye, EyeOff, Mail, UserRound } from 'lucide-react'

const REGISTER_COUNTRIES = [
  { code: 'ES', label: 'Espana', timezone: 'Europe/Madrid' },
  { code: 'CO', label: 'Colombia', timezone: 'America/Bogota' },
  { code: 'MX', label: 'Mexico', timezone: 'America/Mexico_City' },
  { code: 'US', label: 'Estados Unidos', timezone: 'America/New_York' },
  { code: 'AR', label: 'Argentina', timezone: 'America/Buenos_Aires' },
  { code: 'PE', label: 'Peru', timezone: 'America/Bogota' },
  { code: 'CL', label: 'Chile', timezone: 'America/Bogota' },
]

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterLoading />}>
      <RegisterForm />
    </Suspense>
  )
}

function RegisterLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f5f0] text-[#15130f]">
      <div className="rounded-2xl border border-black/10 bg-white px-6 py-4 text-sm font-black shadow-xl shadow-black/8">
        Cargando registro...
      </div>
    </main>
  )
}

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedPlan = searchParams.get('plan')
  const isEnterpriseLead = selectedPlan === 'enterprise'
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: 'ES',
    timezone: 'Europe/Madrid',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.restaurantName.trim()) return setError('El nombre del restaurante es requerido')
    if (!form.email.trim()) return setError('El email es requerido')
    if (!form.password || form.password.length < 8) return setError('La contrasena debe tener al menos 8 caracteres')
    if (form.password !== form.confirmPassword) return setError('Las contrasenas no coinciden')

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
          country: form.country,
          timezone: form.timezone,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Error al registrar (${res.status})`)
        return
      }
      if (!data.tenant?.slug) {
        setError('Error: no se creo el restaurante correctamente')
        return
      }

      router.push(data.redirectUrl || `/${data.tenant.slug}/acceso`)
    } catch (error) {
      setError(`Error de conexion: ${error instanceof Error ? error.message : 'Intenta de nuevo'}`)
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
          <Link href="/login" className="text-sm font-bold text-black/60 transition hover:text-black">
            Ya tengo cuenta
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:py-14">
        <div className="flex items-center">
          <div className="w-full">
            <p className="text-sm font-black uppercase text-[#e43d30]">Alta del restaurante</p>
            <h1 className="mt-3 max-w-2xl text-5xl font-black leading-tight tracking-tight">
              Lanza una experiencia digital que parece de cadena grande.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-black/62">
              Crea tu cuenta, configura tu marca y empieza con menu digital, pedidos, reservas y panel operativo desde el primer dia.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
              {[
                '14 dias de acceso completo',
                'Sin tarjeta para empezar',
                'Tu marca y colores',
                'POS, cocina y QR incluidos',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-bold shadow-sm">
                  <BadgeCheck className="size-5 text-[#1c8b5f]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl shadow-black/8 sm:p-8">
            <div className="mb-7">
              {isEnterpriseLead && (
                <div className="mb-4 rounded-xl border border-[#e43d30]/20 bg-[#fff4f1] px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#e43d30]">Plan Enterprise</p>
                  <p className="mt-1 text-sm font-bold text-[#15130f]/70">
                    Dejanos tus datos y el equipo de ventas prepara una propuesta para tu restaurante o cadena.
                  </p>
                </div>
              )}
              <h2 className="text-3xl font-black tracking-tight">{isEnterpriseLead ? 'Hablar con ventas' : 'Crear cuenta'}</h2>
              <p className="mt-2 text-sm font-medium text-black/55">
                {isEnterpriseLead ? 'Completa el formulario y activamos el contacto comercial.' : 'Completa los datos principales del restaurante.'}
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field icon={<Building2 className="size-4" />} label="Restaurante" required value={form.restaurantName} onChange={(value) => setForm(f => ({ ...f, restaurantName: value }))} placeholder="Pizzeria Roma" />
                <Field icon={<UserRound className="size-4" />} label="Tu nombre" value={form.ownerName} onChange={(value) => setForm(f => ({ ...f, ownerName: value }))} placeholder="Carlos Martinez" />
              </div>

              <Field icon={<Mail className="size-4" />} label="Email" required type="email" value={form.email} onChange={(value) => setForm(f => ({ ...f, email: value }))} placeholder="carlos@restaurante.com" />

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase text-black/48">Pais del restaurante *</span>
                <select
                  value={form.country}
                  onChange={e => {
                    const option = REGISTER_COUNTRIES.find(country => country.code === e.target.value)
                    setForm(f => ({
                      ...f,
                      country: e.target.value,
                      timezone: option?.timezone || f.timezone,
                    }))
                  }}
                  className="h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] px-4 text-sm font-semibold outline-none transition focus:border-[#e43d30] focus:bg-white focus:ring-4 focus:ring-red-500/10"
                >
                  {REGISTER_COUNTRIES.map(country => (
                    <option key={country.code} value={country.code}>{country.label}</option>
                  ))}
                </select>
              </label>

              <PasswordField label="Contrasena" value={form.password} onChange={(value) => setForm(f => ({ ...f, password: value }))} show={showPass} onToggle={() => setShowPass(v => !v)} placeholder="Minimo 8 caracteres" />
              <PasswordField label="Confirmar contrasena" value={form.confirmPassword} onChange={(value) => setForm(f => ({ ...f, confirmPassword: value }))} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} placeholder="Repite la contrasena" />

              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="text-xs font-bold text-red-600">Las contrasenas no coinciden</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#e43d30] text-sm font-black text-white shadow-lg shadow-red-900/15 transition hover:bg-[#c93228] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creando restaurante...' : 'Crear restaurante gratis'}
                {!loading && <ArrowRight className="size-4" />}
              </button>
            </form>

            <p className="mt-5 text-center text-xs leading-5 text-black/45">
              Al registrarte aceptas los terminos de servicio y la politica de privacidad.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  icon: ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-black/48">{label}{required ? ' *' : ''}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35">{icon}</span>
        <input
          type={type}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#e43d30] focus:bg-white focus:ring-4 focus:ring-red-500/10"
          placeholder={placeholder}
        />
      </span>
    </label>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  show: boolean
  onToggle: () => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-black/48">{label} *</span>
      <span className="relative block">
        <input
          type={show ? 'text' : 'password'}
          required
          minLength={8}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-12 w-full rounded-lg border border-black/10 bg-[#fbfaf7] px-4 pr-11 text-sm font-semibold outline-none transition focus:border-[#e43d30] focus:bg-white focus:ring-4 focus:ring-red-500/10"
          placeholder={placeholder}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-black/42 transition hover:bg-black/5 hover:text-black" aria-label={show ? 'Ocultar contrasena' : 'Mostrar contrasena'}>
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  )
}
