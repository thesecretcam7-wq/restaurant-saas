'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CambiarContraseniaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (form.newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al cambiar la contraseña')
        return
      }

      setSuccess(true)
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cambiar Contraseña</h1>
        <p className="text-gray-500 text-sm mt-1">Actualiza la contraseña de tu cuenta</p>
      </div>

      <div className="max-w-md">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <p className="text-green-700 text-sm">✓ Contraseña actualizada correctamente</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Contraseña Actual
              </label>
              <input
                type="password"
                required
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                placeholder="Tu contraseña actual"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                required
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                placeholder="Nueva contraseña"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                placeholder="Confirma tu nueva contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-6 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-4">
            La contraseña debe tener al menos 6 caracteres
          </p>
        </div>
      </div>
    </div>
  )
}
