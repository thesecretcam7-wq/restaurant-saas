'use client'

import { Suspense, use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminLoginSchema } from '@/lib/validations/forms'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'
import SupportButton from '@/components/SupportButton'

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
      <SupportButton />
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

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: 'var(--color-border-light)' }} />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-xs font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-surface-primary) 80%, transparent)', color: 'var(--color-text-tertiary)' }}>O continua con</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true)
                const { signInWithGoogle } = await import('@/lib/supabase/client')
                await signInWithGoogle()
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al iniciar sesion con Google')
                setLoading(false)
              }
            }}
            className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-3 transition-all border disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-surface-secondary)', borderColor: 'var(--color-border-light)', color: 'var(--color-text-primary)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando...' : 'Continuar con Google'}
          </button>

          <p className="mt-5 text-center text-xs font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
            ¿Tienes algún problema?{' '}
            <a href="/soporte" className="font-black underline-offset-2 hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
              Contactar soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
