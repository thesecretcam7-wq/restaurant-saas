'use client'

import { useState } from 'react'

interface UnlockAccountModalProps {
  tenantId: string
  tenantName: string
  onClose: () => void
  onSuccess: () => void
}

export default function UnlockAccountModal({ tenantId, tenantName, onClose, onSuccess }: UnlockAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'extend_trial' | 'activate_subscription'>('extend_trial')
  const [daysToAdd, setDaysToAdd] = useState(30)
  const [error, setError] = useState('')

  const handleUnlock = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          daysToAdd,
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al desbloquear cuenta')
        return
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError('Error de conexión')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Desbloquear Cuenta</h2>
        <p className="text-gray-600 mb-6">{tenantName}</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Tipo de Desbloqu</label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400" style={{ borderColor: action === 'extend_trial' ? '#3B82F6' : '' }}>
                <input
                  type="radio"
                  value="extend_trial"
                  checked={action === 'extend_trial'}
                  onChange={(e) => setAction(e.target.value as 'extend_trial')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Extender Prueba</p>
                  <p className="text-xs text-gray-500">Agregar días al período de prueba</p>
                </div>
              </label>

              <label className="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-400" style={{ borderColor: action === 'activate_subscription' ? '#3B82F6' : '' }}>
                <input
                  type="radio"
                  value="activate_subscription"
                  checked={action === 'activate_subscription'}
                  onChange={(e) => setAction(e.target.value as 'activate_subscription')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Activar Suscripción</p>
                  <p className="text-xs text-gray-500">Marcar como pago recibido</p>
                </div>
              </label>
            </div>
          </div>

          {action === 'extend_trial' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Días a Agregar</label>
              <input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {action === 'activate_subscription' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                ✅ Se marcará como suscripción activa con plan <strong>Basic</strong> por 30 días
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleUnlock}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400"
          >
            {loading ? 'Desbloqueando...' : 'Desbloquear'}
          </button>
        </div>
      </div>
    </div>
  )
}
