'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function MeseroConfigPage() {
  const params = useParams()
  const tenantId = params.domain as string

  const [waiterPin, setWaiterPin] = useState('')
  const [kitchenPin, setKitchenPin] = useState('')
  const [showWaiterPin, setShowWaiterPin] = useState(false)
  const [showKitchenPin, setShowKitchenPin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [statusRes, settingsRes] = await Promise.all([
        fetch(`/api/subscription-status?domain=${tenantId}`),
        fetch(`/api/restaurant-settings?domain=${tenantId}`).catch(() => null),
      ])
      const status = await statusRes.json()
      setIsPro(['pro', 'premium'].includes(status.plan || ''))

      if (settingsRes && settingsRes.ok) {
        const s = await settingsRes.json()
        setWaiterPin(s.waiter_pin || '')
        setKitchenPin(s.kitchen_pin || '')
      }
      setLoading(false)
    }
    load()
  }, [tenantId])

  const handleSave = async () => {
    if (waiterPin && (waiterPin.length < 4 || waiterPin.length > 6)) {
      alert('El PIN debe tener entre 4 y 6 dígitos')
      return
    }
    if (kitchenPin && (kitchenPin.length < 4 || kitchenPin.length > 6)) {
      alert('El PIN debe tener entre 4 y 6 dígitos')
      return
    }

    setSaving(true)
    try {
      await fetch('/api/restaurant-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantId, waiter_pin: waiterPin || null, kitchen_pin: kitchenPin || null }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Función Pro</h1>
          <p className="text-slate-600 mb-6 text-sm">
            El sistema de mesero y cocina está disponible en los planes <strong>Pro</strong> y <strong>Premium</strong>.
          </p>
          <Link
            href={`/${tenantId}/configuracion/planes`}
            className="inline-block bg-blue-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Ver planes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/${tenantId}/configuracion`} className="text-slate-400 text-sm hover:text-slate-600 flex items-center gap-1 mb-4">
            ← Volver a configuración
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-3xl">👨‍🍳</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Sistema Mesero / Cocina</h1>
              <p className="text-slate-500 text-sm">Configura los PINs de acceso para el personal</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
          <span className="text-xl flex-shrink-0">ℹ️</span>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">¿Cómo funciona?</p>
            <ul className="space-y-1 text-blue-700">
              <li>• <strong>Mesero</strong> abre <code className="bg-blue-100 px-1 rounded">/{tenantId}/mesero</code> en su teléfono</li>
              <li>• <strong>Cocina</strong> abre <code className="bg-blue-100 px-1 rounded">/{tenantId}/cocina</code> en la pantalla</li>
              <li>• Los pedidos aparecen en cocina en tiempo real</li>
              <li>• Cocina puede marcar pedidos como "preparando" o "listo"</li>
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          {/* Waiter PIN */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📱</span>
              <div>
                <h2 className="font-bold text-slate-900">PIN de Mesero</h2>
                <p className="text-slate-500 text-sm">Los meseros usan este PIN para crear pedidos</p>
              </div>
            </div>
            <div className="relative">
              <input
                type={showWaiterPin ? 'text' : 'password'}
                value={waiterPin}
                onChange={e => setWaiterPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ej: 1234"
                inputMode="numeric"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowWaiterPin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showWaiterPin ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2">4 a 6 dígitos numéricos</p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 font-medium mb-1">URL para meseros:</p>
              <code className="text-xs text-blue-600">
                {typeof window !== 'undefined' ? window.location.origin : ''}/{tenantId}/mesero
              </code>
            </div>
          </div>

          {/* Kitchen PIN */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🍳</span>
              <div>
                <h2 className="font-bold text-slate-900">PIN de Cocina</h2>
                <p className="text-slate-500 text-sm">El personal de cocina usa este PIN en la pantalla</p>
              </div>
            </div>
            <div className="relative">
              <input
                type={showKitchenPin ? 'text' : 'password'}
                value={kitchenPin}
                onChange={e => setKitchenPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ej: 5678"
                inputMode="numeric"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest focus:outline-none focus:border-orange-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKitchenPin(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKitchenPin ? '🙈' : '👁️'}
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2">4 a 6 dígitos numéricos</p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-xs text-slate-500 font-medium mb-1">URL para cocina:</p>
              <code className="text-xs text-orange-600">
                {typeof window !== 'undefined' ? window.location.origin : ''}/{tenantId}/cocina
              </code>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-bold text-white text-lg transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 active:scale-95"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar PINs'}
          </button>

          {/* Quick access links */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`/${tenantId}/mesero`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-semibold hover:border-blue-400 transition-colors text-sm"
            >
              📱 Abrir mesero
            </a>
            <a
              href={`/${tenantId}/cocina`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-700 font-semibold hover:border-orange-400 transition-colors text-sm"
            >
              🍳 Abrir cocina
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
