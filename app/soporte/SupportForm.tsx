'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Send } from 'lucide-react'

export default function SupportForm() {
  const [form, setForm] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    restaurantName: '',
    subject: '',
    message: '',
    priority: 'normal',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const updateField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/support-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'No se pudo enviar el mensaje.')
        return
      }

      setSent(true)
    } catch (err) {
      setError('No se pudo conectar con soporte.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-green-200 bg-white p-8 shadow-sm">
        <CheckCircle2 className="mb-4 size-12 text-green-600" />
        <h2 className="text-2xl font-black text-black">Mensaje recibido</h2>
        <p className="mt-3 text-sm font-semibold leading-6 text-black/58">
          Tu pregunta ya quedo guardada en el panel interno de Eccofood. Te responderemos lo antes posible.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-black px-5 text-sm font-black text-white"
        >
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-black/8 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Tu nombre</span>
          <input
            value={form.contactName}
            onChange={(event) => updateField('contactName', event.target.value)}
            required
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Email</span>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(event) => updateField('contactEmail', event.target.value)}
            required
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Telefono</span>
          <input
            value={form.contactPhone}
            onChange={(event) => updateField('contactPhone', event.target.value)}
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Restaurante</span>
          <input
            value={form.restaurantName}
            onChange={(event) => updateField('restaurantName', event.target.value)}
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Asunto</span>
          <input
            value={form.subject}
            onChange={(event) => updateField('subject', event.target.value)}
            required
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-black text-black">Prioridad</span>
          <select
            value={form.priority}
            onChange={(event) => updateField('priority', event.target.value)}
            className="h-12 w-full rounded-xl border border-black/10 px-4 text-sm font-semibold outline-none focus:border-[#ff6b1a]"
          >
            <option value="normal">Normal</option>
            <option value="urgent">Urgente</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className="text-sm font-black text-black">Pregunta o mensaje</span>
        <textarea
          value={form.message}
          onChange={(event) => updateField('message', event.target.value)}
          required
          rows={7}
          className="w-full resize-none rounded-xl border border-black/10 px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#ff6b1a]"
        />
      </label>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff6b1a] px-5 text-sm font-black text-white shadow-lg shadow-orange-900/14 transition hover:bg-[#ed5f12] disabled:opacity-70 sm:w-auto"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Enviar mensaje
      </button>
    </form>
  )
}
