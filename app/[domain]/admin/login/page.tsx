'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { adminLoginSchema } from '@/lib/validations/forms'
import { getFieldError, parseValidationError } from '@/lib/validations/utils'

interface Props { params: Promise<{ domain: string }> }

export default function AdminLoginPage({ params }: Props) {
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
        background: 'linear-gradient(to bottom right, white, rgba(219, 234, 254, 0.5), rgba(220, 252, 231, 0.5))'
      }}
    >
      {/* Background accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100/30 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-orange-100/20 rounded-full blur-3xl" />

      <div className="w-full max-w-sm relative z-10">
        <div className="rounded-2xl border border-gray-200/60 p-8 bg-white/80 backdrop-blur-sm shadow-lg animate-slide-up">
          <div className="mb-6 animate-fade-in">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Panel Admin</h1>
            <p className="text-sm text-gray-600">Accede con tu cuenta de administrador</p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className={`w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 ${getFieldError(errors, 'email') ? 'border-red-300' : ''}`}
                placeholder="tu@restaurante.com"
              />
              {getFieldError(errors, 'email') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'email')}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Contraseña</label>
              <input
                required
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({...f, password: e.target.value}))}
                className={`w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 ${getFieldError(errors, 'password') ? 'border-red-300' : ''}`}
                placeholder="Tu contraseña"
              />
              {getFieldError(errors, 'password') && <p className="text-red-500 text-xs mt-1">{getFieldError(errors, 'password')}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-6 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg text-sm font-bold hover:from-red-700 hover:to-orange-700 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/80 px-2 text-gray-500">O continúa con</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true)
                const { signInWithGoogle } = await import('@/lib/supabase/client')
                await signInWithGoogle()
              } catch (err: any) {
                setError(err.message || 'Error al iniciar sesión con Google')
                setLoading(false)
              }
            }}
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold text-sm bg-white border border-gray-300 text-gray-900 hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Conectando...' : 'Google'}
          </button>
        </div>
      </div>
    </div>
  )
}
