'use client'

import { Suspense, use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'
import SupportButton from '@/components/SupportButton'
import { createClient } from '@/lib/supabase/client'

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
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([])

  useEffect(() => {
    if (searchParams.get('reason') === 'otra_sesion') {
      setError('Tu sesión fue cerrada porque se inició en otro dispositivo.')
    }
    const authError = searchParams.get('error')
    if (authError) setError(authError)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setErrors([])
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); return }
      const destination = `/${data.tenant.slug}/admin/dashboard`
      router.replace(destination)
      window.setTimeout(() => {
        if (window.location.pathname !== destination) {
          window.location.assign(destination)
        }
      }, 700)
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

  const handleGoogleSignIn = async () => {
    setError('')
    setErrors([])
    setGoogleLoading(true)

    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('next', `/${tenantId}/admin/login`)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      })

      if (error) {
        setError('No pudimos abrir el inicio de sesion con Google.')
        setGoogleLoading(false)
      }
    } catch {
      setError('Error de conexion con Google')
      setGoogleLoading(false)
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

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full py-3 rounded-lg text-sm font-bold active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'var(--color-surface-secondary)',
              borderColor: 'var(--color-border-light)',
              borderWidth: '1px',
              color: 'var(--color-text-primary)'
            }}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-base font-black text-[#4285F4]">G</span>
            {googleLoading ? 'Abriendo Google...' : 'Continuar con Google'}
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
            <span className="text-xs font-bold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>o entra con email</span>
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--color-border-light)' }} />
          </div>

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
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Contraseña</label>
                <a href="/forgot-password" className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                  Olvide mi contrasena
                </a>
              </div>
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
              disabled={loading || googleLoading}
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
