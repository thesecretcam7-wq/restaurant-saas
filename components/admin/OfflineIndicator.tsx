'use client'

import { useOfflineManager } from '@/lib/offline/hooks'
import { AlertCircle, Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

interface OfflineIndicatorProps {
  className?: string
  position?: 'fixed' | 'absolute'
}

export function OfflineIndicator({
  className = '',
  position = 'fixed'
}: OfflineIndicatorProps) {
  const {
    isOffline,
    isSyncing,
    lastSyncFormatted,
    syncError,
    pendingOperations,
    sync,
  } = useOfflineManager()

  const [showDetails, setShowDetails] = useState(false)
  const [syncAttempted, setSyncAttempted] = useState(false)

  // Hide details after 5 seconds of success
  useEffect(() => {
    if (!isSyncing && syncAttempted && !syncError) {
      const timer = setTimeout(() => {
        setShowDetails(false)
        setSyncAttempted(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [isSyncing, syncAttempted, syncError])

  const handleSync = async () => {
    setSyncAttempted(true)
    try {
      await sync()
    } catch (err) {
      console.error('Sync error:', err)
    }
  }

  // Don't show if online and no pending operations
  if (!isOffline && pendingOperations.length === 0) {
    return null
  }

  const positionClass = position === 'fixed'
    ? 'fixed bottom-4 right-4 z-40'
    : 'absolute bottom-4 right-4'

  return (
    <div className={`${positionClass} ${className}`}>
      {/* Main indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          text-sm transition-all duration-300 shadow-lg
          ${isOffline
            ? 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200'
            : pendingOperations.length > 0
            ? 'bg-yellow-100 text-yellow-900 border border-yellow-300 hover:bg-yellow-200'
            : 'bg-green-100 text-green-900 border border-green-300 hover:bg-green-200'
          }
        `}
      >
        {isOffline ? (
          <WifiOff className="w-4 h-4" />
        ) : isSyncing ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : syncAttempted && !syncError ? (
          <CheckCircle className="w-4 h-4" />
        ) : pendingOperations.length > 0 ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}

        <span>
          {isOffline
            ? 'Sin conexión'
            : isSyncing
            ? 'Sincronizando...'
            : syncAttempted && !syncError
            ? '✓ Sincronizado'
            : pendingOperations.length > 0
            ? `${pendingOperations.length} pendiente${pendingOperations.length !== 1 ? 's' : ''}`
            : 'En línea'}
        </span>
      </button>

      {/* Details panel */}
      {showDetails && (
        <div
          className={`
            absolute bottom-full right-0 mb-2 w-80 rounded-lg
            bg-white border border-gray-200 shadow-xl p-4
            space-y-3 text-sm
          `}
        >
          {/* Status section */}
          <div className="border-b pb-3">
            <div className="flex items-center gap-2 mb-2">
              {isOffline ? (
                <WifiOff className="w-4 h-4 text-red-600" />
              ) : (
                <Wifi className="w-4 h-4 text-green-600" />
              )}
              <span className="font-semibold text-gray-900">
                {isOffline ? 'Desconectado' : 'Conectado'}
              </span>
            </div>
            <p className="text-gray-600 text-xs">
              {isOffline
                ? 'Los cambios se guardarán localmente y se sincronizarán cuando vuelva la conexión.'
                : 'Tus datos se sincronizarán automáticamente con el servidor.'}
            </p>
          </div>

          {/* Last sync time */}
          {!isOffline && (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Última sincronización:</span>
              <span className="text-gray-900 font-medium">{lastSyncFormatted}</span>
            </div>
          )}

          {/* Pending operations */}
          {pendingOperations.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <p className="text-yellow-900 font-medium mb-2">
                {pendingOperations.length} cambio{pendingOperations.length !== 1 ? 's' : ''} pendiente{pendingOperations.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1 text-xs text-yellow-800">
                {pendingOperations.slice(0, 5).map(op => (
                  <div key={op.id} className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-600" />
                    <span>
                      {op.type === 'create' && '➕'}
                      {op.type === 'update' && '✏️'}
                      {op.type === 'delete' && '🗑️'} {op.table}
                    </span>
                  </div>
                ))}
                {pendingOperations.length > 5 && (
                  <p className="text-yellow-700 pt-1">
                    y {pendingOperations.length - 5} más...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {syncError && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-900 font-medium text-xs mb-1">Error de sincronización</p>
              <p className="text-red-800 text-xs">{syncError}</p>
            </div>
          )}

          {/* Sync button */}
          {!isOffline && pendingOperations.length > 0 && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className={`
                w-full py-2 rounded-md font-medium text-sm
                transition-all duration-300
                ${isSyncing
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-blue-600 text-white cursor-pointer'
                }
              `}
            >
              {isSyncing ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sincronizando...
                </span>
              ) : (
                'Sincronizar ahora'
              )}
            </button>
          )}

          {/* Online indicator when all synced */}
          {!isOffline && pendingOperations.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-green-900 text-xs font-medium">
                ✓ Todos los cambios están sincronizados
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
