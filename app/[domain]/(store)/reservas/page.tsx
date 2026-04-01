'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props { params: Promise<{ domain: string }> }

const TIMES = ['12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30']

export default function ReservasPage({ params }: Props) {
  const { domain: tenantId } = use(params)
  const router = useRouter()
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [reservation, setReservation] = useState<any>(null)
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    party_size: '2',
    reservation_date: '',
    reservation_time: '',
    notes: '',
  })

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
    if (data.id) {
      setReservation(data)
      setStep('done')
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📅</div>
          <h1 className="text-2xl font-bold mb-2">¡Reserva enviada!</h1>
          <p className="text-gray-500 mb-6">Recibirás una confirmación pronto.</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Nombre</span><span className="font-medium">{form.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-medium">{form.reservation_date}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Hora</span><span className="font-medium">{form.reservation_time}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Personas</span><span className="font-medium">{form.party_size}</span></div>
          </div>
          <Link href={`/${tenantId}`} className="block w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Link href={`/${tenantId}`} className="text-gray-500 hover:text-gray-700">←</Link>
          <h1 className="font-semibold">Hacer reserva</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Datos de contacto</h2>
            <input required value={form.customer_name} onChange={e => setForm(f => ({...f, customer_name: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre completo *" />
            <input required value={form.customer_phone} onChange={e => setForm(f => ({...f, customer_phone: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Teléfono *" type="tel" />
            <input required value={form.customer_email} onChange={e => setForm(f => ({...f, customer_email: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email *" type="email" />
          </div>

          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold">Detalles de la reserva</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
                <input required type="date" min={minDateStr} value={form.reservation_date}
                  onChange={e => setForm(f => ({...f, reservation_date: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Personas *</label>
                <select required value={form.party_size} onChange={e => setForm(f => ({...f, party_size: e.target.value}))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? 'persona' : 'personas'}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Hora *</label>
              <div className="grid grid-cols-4 gap-2">
                {TIMES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({...f, reservation_time: t}))}
                    className={`py-2 rounded-lg text-sm border font-medium transition-colors ${form.reservation_time === t ? 'bg-blue-600 text-white border-blue-600' : 'hover:border-blue-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alergias, ocasión especial... (opcional)" rows={2} />
          </div>

          <button type="submit" disabled={loading || !form.reservation_time}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300">
            {loading ? 'Enviando...' : 'Solicitar Reserva'}
          </button>
        </form>
      </main>
    </div>
  )
}
