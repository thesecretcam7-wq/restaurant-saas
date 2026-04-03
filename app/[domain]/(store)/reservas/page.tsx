'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props { params: Promise<{ domain: string }> }

const TIMES = ['12:00','12:30','13:00','13:30','14:00','14:30','19:00','19:30','20:00','20:30','21:00','21:30']

export default function ReservasPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_email: '', customer_phone: '', party_size: '2', reservation_date: '', reservation_time: '', notes: '' })

  useEffect(() => {
    fetch(`/api/settings/${tenantId}`).then(r => r.json()).then(s => {
      setSettings(s)
      if (!s?.reservations_enabled) router.replace(`/${tenantId}`)
    })
  }, [tenantId, router])

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...form, party_size: parseInt(form.party_size) }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.id) setDone(true)
  }

  const primary = 'var(--primary-color, #3B82F6)'
  const inputCls = "w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all placeholder:text-gray-400"

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}15` }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${primary}25` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{ backgroundColor: primary }}>
                <span className="text-white">📅</span>
              </div>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">¡Reserva enviada!</h1>
        <p className="text-gray-400 text-sm text-center mb-6 max-w-xs">Te confirmaremos tu reserva a la brevedad por teléfono o email.</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full max-w-sm mb-6 space-y-2">
          {[
            { label: 'Nombre', value: form.customer_name },
            { label: 'Fecha', value: form.reservation_date },
            { label: 'Hora', value: form.reservation_time },
            { label: 'Personas', value: `${form.party_size} personas` },
          ].map(row => (
            <div key={row.label} className="flex justify-between text-sm">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-bold text-gray-900">{row.value}</span>
            </div>
          ))}
        </div>
        <Link href={`/${tenantId}`} className="w-full max-w-sm py-3.5 rounded-2xl text-white font-bold text-sm text-center block shadow-lg active:scale-95 transition-transform" style={{ backgroundColor: primary }}>
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/${tenantId}`} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </Link>
          <div>
            <h1 className="font-extrabold text-gray-900">Hacer reserva</h1>
            <p className="text-xs text-gray-400">Reserva tu mesa en minutos</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>1</span>
              Datos de contacto
            </h2>
            <input required value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))} className={inputCls} placeholder="Nombre completo *" />
            <input required value={form.customer_phone} onChange={e => setForm(f => ({...f, customer_phone: e.target.value}))} className={inputCls} placeholder="Teléfono *" type="tel" />
            <input required value={form.customer_email} onChange={e => setForm(f => ({...f, customer_email: e.target.value}))} className={inputCls} placeholder="Email *" type="email" />
          </div>

          {/* Reservation details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: primary }}>2</span>
              Detalles de la reserva
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Fecha *</label>
                <input required type="date" min={minDateStr} value={form.reservation_date}
                  onChange={e => setForm(f => ({...f, reservation_date: e.target.value}))}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">Personas *</label>
                <select required value={form.party_size} onChange={e => setForm(f => ({...f, party_size: e.target.value}))} className={inputCls}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 mb-2">Hora *</label>
              <div className="grid grid-cols-4 gap-2">
                {TIMES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({...f, reservation_time: t}))}
                    className="py-2.5 rounded-xl text-xs font-bold border-2 transition-all active:scale-95"
                    style={form.reservation_time === t
                      ? { backgroundColor: primary, borderColor: primary, color: '#fff' }
                      : { borderColor: '#E2E8F0', color: '#64748B' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className={inputCls + ' resize-none'}
              placeholder="Ocasión especial, alergias, silla para bebé... (opcional)" rows={2} />
          </div>

          <button type="submit" disabled={loading || !form.reservation_time}
            className="w-full py-4 rounded-2xl text-white font-extrabold text-sm shadow-lg active:scale-95 transition-all disabled:opacity-40"
            style={{ backgroundColor: primary }}>
            {loading ? 'Enviando reserva...' : '📅 Solicitar Reserva'}
          </button>
          <p className="text-center text-xs text-gray-400 pb-2">Recibirás confirmación en tu teléfono o email</p>
        </form>
      </main>
    </div>
  )
}
