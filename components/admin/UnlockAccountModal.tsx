'use client'

import { useState } from 'react'

type AccountAction = 'extend_trial' | 'manual_subscription' | 'timed_subscription' | 'suspend' | 'delete_tenant'
type Plan = 'basic' | 'pro' | 'premium'

interface UnlockAccountModalProps {
  tenantId: string
  tenantName: string
  currentPlan?: string | null
  currentStatus?: string | null
  onClose: () => void
  onSuccess: () => void
}

export default function UnlockAccountModal({
  tenantId,
  tenantName,
  currentPlan,
  currentStatus,
  onClose,
  onSuccess,
}: UnlockAccountModalProps) {
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<AccountAction>('manual_subscription')
  const [plan, setPlan] = useState<Plan>((currentPlan as Plan) || 'basic')
  const [daysToAdd, setDaysToAdd] = useState(30)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/unlock-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          action,
          plan,
          daysToAdd,
          deleteConfirmation,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al actualizar la cuenta')
        return
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError('Error de conexion')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const optionClass = (selected: boolean) =>
    `flex items-center p-3 border-2 rounded-lg cursor-pointer hover:border-blue-400 ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
    }`

  const deleteConfirmationText = `ELIMINAR ${tenantName}`
  const isDeleteBlocked = action === 'delete_tenant' && deleteConfirmation !== deleteConfirmationText

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestionar Cuenta</h2>
        <p className="text-gray-600 mb-1">{tenantName}</p>
        <p className="text-xs text-gray-500 mb-6">
          Estado actual: {currentStatus || '-'} - Plan actual: {currentPlan || '-'}
        </p>

        <div className="space-y-5 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Accion</label>
            <div className="space-y-2">
              <label className={optionClass(action === 'manual_subscription')}>
                <input
                  type="radio"
                  value="manual_subscription"
                  checked={action === 'manual_subscription'}
                  onChange={() => setAction('manual_subscription')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Cuenta manual sin vencimiento</p>
                  <p className="text-xs text-gray-500">Para clientes que decides activar por fuera de Stripe.</p>
                </div>
              </label>

              <label className={optionClass(action === 'timed_subscription')}>
                <input
                  type="radio"
                  value="timed_subscription"
                  checked={action === 'timed_subscription'}
                  onChange={() => setAction('timed_subscription')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Cuenta manual con vencimiento</p>
                  <p className="text-xs text-gray-500">Activa un plan manual por cierta cantidad de dias.</p>
                </div>
              </label>

              <label className={optionClass(action === 'extend_trial')}>
                <input
                  type="radio"
                  value="extend_trial"
                  checked={action === 'extend_trial'}
                  onChange={() => setAction('extend_trial')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Extender prueba gratis</p>
                  <p className="text-xs text-gray-500">Agrega dias al periodo de prueba.</p>
                </div>
              </label>

              <label className={optionClass(action === 'suspend')}>
                <input
                  type="radio"
                  value="suspend"
                  checked={action === 'suspend'}
                  onChange={() => setAction('suspend')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">Suspender cuenta</p>
                  <p className="text-xs text-gray-500">Bloquea el acceso hasta que vuelvas a activarla.</p>
                </div>
              </label>

              <label className={`flex items-center p-3 border-2 rounded-lg cursor-pointer hover:border-red-400 ${
                action === 'delete_tenant' ? 'border-red-500 bg-red-50' : 'border-gray-200'
              }`}>
                <input
                  type="radio"
                  value="delete_tenant"
                  checked={action === 'delete_tenant'}
                  onChange={() => setAction('delete_tenant')}
                  className="w-4 h-4"
                />
                <div className="ml-3">
                  <p className="font-medium text-red-900">Eliminar restaurante definitivamente</p>
                  <p className="text-xs text-red-600">Borra la cuenta y sus datos relacionados. Esta accion no se puede deshacer.</p>
                </div>
              </label>
            </div>
          </div>

          {(action === 'manual_subscription' || action === 'timed_subscription') && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as Plan)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          )}

          {(action === 'extend_trial' || action === 'timed_subscription') && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                {action === 'extend_trial' ? 'Dias a agregar' : 'Dias de vigencia'}
              </label>
              <input
                type="number"
                value={daysToAdd}
                onChange={(e) => setDaysToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="3650"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {action === 'delete_tenant' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-900">
                Para confirmar, escribe exactamente:
              </p>
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-black text-red-700">
                {deleteConfirmationText}
              </p>
              <input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="mt-3 w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={deleteConfirmationText}
              />
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
            onClick={handleSave}
            disabled={loading || isDeleteBlocked}
            className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition-colors disabled:opacity-60 ${
              action === 'delete_tenant' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Guardando...' : action === 'delete_tenant' ? 'Eliminar definitivamente' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
