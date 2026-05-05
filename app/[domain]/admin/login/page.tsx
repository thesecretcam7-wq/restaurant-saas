'use client'

import { Suspense, use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminLoginSchema } from '@/lib/validations/forms'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'

interface Props { params: Promise<{ domain: string }> }

export default function AdminLoginPage({ params }: Props) {
  return (
    <Suspense fallback={<AdminLoginLoading />}>
      <AdminLoginContent params={params} />
    </Suspense>
  )
}

function AdminLoginLoading() {
  return (
    <div className="min-h-screen grid place-items-center bg-white">
      <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-gray-900 animate-spin" />
    </div>
  )
}

function AdminLoginContent({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([])

  useEffect(() => {
    if (searchParams.get('reason') === 'otra_sesion') {
      setError('Tu sesión fue cerrada porque se inició en otro dispositivo.')
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrors([])
    setLoading(true)
    try {
      const validated = adminLoginSchema.parse(form)
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validated),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return }
      router.push(`/${data.tenant.slug}/acceso`)
    } catch (error: any) {
      if (error.errors) {
        const validationErrors = parseValidationError(error)
        setErrors(validationErrors)
        setError(validationErrors[0]?.message || 'Corrige los errores del formulario')
      } else {
        setError('Error de conexión')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom right, var(--color-surface-primary), color-mix(in srgb, var(--color-primary) 5%, white), color-mix(in srgb, var(--color-success) 5%, white))`
      }}
    >
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ backgroundColor: 'var(--color-primary)' }} />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20" style={{ backgroundColor: 'var(--color-secondary)' }} />

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl border p-8 backdrop-blur-sm shadow-lg animate-slide-up" style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface-primary) 80%, transparent)', borderColor: 'var(--color-border-light)' }}>
          <div className="mb-6 animate-fade-in">
            <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>Panel Admin</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Accede con tu cuenta de administrador</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-lg text-sm flex items-center gap-2.5" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, white)', color: 'var(--color-danger)', borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)', borderWidth: '1px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: getFieldError(errors, 'email') ? 'var(--color-danger)' : 'var(--color-border-light)',
                  borderWidth: '1px',
                  color: 'var(--color-text-primary)',
                  '--tw-ring-color': 'var(--color-primary)',
                  '--placeholder-color': 'var(--color-text-tertiary)'
                } as React.CSSProperties}
                placeholder="tu@restaurante.com"
              />
              {getFieldError(errors, 'email') && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{getFieldError(errors, 'email')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Contraseña</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: 'var(--color-surface-secondary)',
                  borderColor: getFieldError(errors, 'password') ? 'var(--color-danger)' : 'var(--color-border-light)',
                  borderWidth: '1px',
                  color: 'var(--color-text-primary)',
                  '--tw-ring-color': 'var(--color-primary)',
                  '--placeholder-color': 'var(--color-text-tertiary)'
                } as React.CSSProperties}
                placeholder="Tu contraseña"
              />
              {getFieldError(errors, 'password') && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{getFieldError(errors, 'password')}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 rounded-lg text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              style={{
                background: `linear-gradient(to right, var(--color-primary), var(--color-secondary))`,
                backgroundImage: loading ? undefined : `linear-gradient(to right, var(--color-primary), var(--color-secondary))`,
              }}
              onMouseEnter={e => {
                if (!loading) {
                  e.currentTarget.style.filter = 'brightness(0.9)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
