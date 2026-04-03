'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface Props { tenantId: string }

type Status = 'none' | 'pending' | 'verified' | 'not_added' | 'unknown' | 'loading' | 'saving'

export default function DominioForm({ tenantId }: Props) {
  const [currentDomain, setCurrentDomain] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<Status>('loading')
  const [verification, setVerification] = useState<any[]>([])
  const [cname] = useState('cname.vercel-dns.com')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  useEffect(() => {
    fetch(`/api/tenant/domain?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        setCurrentDomain(data.domain)
        setInput(data.domain || '')
        setStatus(data.status || 'none')
        setVerification(data.verification || [])
      })
  }, [tenantId])

  const handleSave = async () => {
    const domain = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!domain) return

    setStatus('saving')
    const res = await fetch('/api/tenant/domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, domain }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Error al guardar')
      setStatus(currentDomain ? 'pending' : 'none')
      return
    }

    setCurrentDomain(data.domain)
    setStatus(data.status)
    setVerification(data.verification || [])
    toast.success('Dominio guardado correctamente')
  }

  const handleDelete = async () => {
    setShowConfirmDelete(false)
    setStatus('saving')
    const res = await fetch('/api/tenant/domain', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    })
    if (res.ok) {
      setCurrentDomain(null)
      setInput('')
      setStatus('none')
      toast.success('Dominio eliminado')
    }
  }

  const checkStatus = async () => {
    setStatus('loading')
    const res = await fetch(`/api/tenant/domain?tenantId=${tenantId}`)
    const data = await res.json()
    setStatus(data.status)
    setVerification(data.verification || [])
    if (data.status === 'verified') toast.success('¡Dominio verificado y activo!')
    else toast('Dominio aún pendiente de verificación', { icon: '⏳' })
  }

  const isLoading = status === 'loading' || status === 'saving'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dominio Personalizado</h1>
        <p className="text-gray-500 text-sm mt-1">Conecta tu propio dominio para que los clientes accedan a tu restaurante</p>
      </div>

      {/* Current status banner */}
      {currentDomain && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          status === 'verified' ? 'bg-green-50 border border-green-200' :
          status === 'pending'  ? 'bg-yellow-50 border border-yellow-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            status === 'verified' ? 'bg-green-500' :
            status === 'pending'  ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{currentDomain}</p>
            <p className={`text-xs mt-0.5 ${
              status === 'verified' ? 'text-green-600' :
              status === 'pending'  ? 'text-yellow-600' :
              'text-gray-500'
            }`}>
              {status === 'verified' ? '✓ Activo y funcionando' :
               status === 'pending'  ? 'Esperando configuración DNS' :
               'Estado desconocido'}
            </p>
          </div>
          {status !== 'verified' && (
            <button onClick={checkStatus} disabled={isLoading}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex-shrink-0">
              Verificar
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Dominio</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tu dominio</label>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="mirestaurante.com"
              className="flex-1 px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={isLoading}
            />
            <button
              onClick={handleSave}
              disabled={isLoading || !input.trim() || input.trim() === currentDomain}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {status === 'saving' ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">Sin www ni https — ejemplo: <span className="font-mono">mirestaurante.com</span></p>
        </div>

        {currentDomain && (
          <div className="pt-2 border-t">
            {!showConfirmDelete ? (
              <button onClick={() => setShowConfirmDelete(true)} className="text-sm text-red-500 hover:text-red-600">
                Eliminar dominio personalizado
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">¿Seguro?</span>
                <button onClick={handleDelete} className="text-sm font-medium text-red-600 hover:text-red-700">Sí, eliminar</button>
                <button onClick={() => setShowConfirmDelete(false)} className="text-sm text-gray-400">Cancelar</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DNS Instructions */}
      {currentDomain && status !== 'verified' && (
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold flex items-center justify-center">!</span>
            Configura tu DNS
          </h2>
          <p className="text-sm text-gray-500">
            Entra al panel donde compraste tu dominio (GoDaddy, Namecheap, Cloudflare, etc.) y agrega este registro DNS:
          </p>

          <div className="bg-gray-50 rounded-xl overflow-hidden border">
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {[
                { label: 'Tipo', value: 'CNAME' },
                { label: 'Nombre / Host', value: '@  (o tu dominio raíz)' },
                { label: 'Valor / Apunta a', value: cname },
              ].map(row => (
                <div key={row.label} className="bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{row.label}</p>
                  <p className="font-mono text-sm font-bold text-gray-800 break-all">{row.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Provider quick links */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Guías por proveedor</p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'GoDaddy', url: 'https://godaddy.com/help/add-a-cname-record-19236' },
                { name: 'Namecheap', url: 'https://namecheap.com/support/knowledgebase/article.aspx/9646' },
                { name: 'Cloudflare', url: 'https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records' },
                { name: 'Google Domains', url: 'https://support.google.com/domains/answer/9211383' },
              ].map(p => (
                <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-600 transition-colors">
                  {p.name} →
                </a>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3 flex gap-2">
            <span className="text-blue-500 text-sm">ℹ</span>
            <p className="text-xs text-blue-700">
              Los cambios DNS pueden demorar entre <strong>5 minutos y 24 horas</strong> en propagarse. Una vez activo, haz clic en <strong>Verificar</strong> para confirmar.
            </p>
          </div>
        </div>
      )}

      {/* Success state */}
      {status === 'verified' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">✅</div>
          <div>
            <p className="font-semibold text-green-800">¡Dominio activo!</p>
            <p className="text-sm text-green-600 mt-0.5">
              Tu restaurante ya es accesible en{' '}
              <a href={`https://${currentDomain}`} target="_blank" rel="noopener noreferrer"
                className="font-mono font-bold underline">
                {currentDomain}
              </a>
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 mb-4">¿Cómo funciona?</h3>
        <div className="space-y-3">
          {[
            { step: '1', title: 'Compras tu dominio', desc: 'En cualquier proveedor: GoDaddy, Namecheap, Cloudflare, etc.' },
            { step: '2', title: 'Lo ingresas aquí', desc: 'Escribes el dominio y hacés clic en Guardar.' },
            { step: '3', title: 'Configuras el DNS', desc: 'Agregas el registro CNAME en tu proveedor de dominio.' },
            { step: '4', title: 'Listo automáticamente', desc: 'En minutos tu restaurante funciona con tu dominio. Sin nada más.' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{item.step}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
