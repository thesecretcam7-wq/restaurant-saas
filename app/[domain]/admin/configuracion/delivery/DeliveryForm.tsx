'use client'

import { useEffect, useState } from 'react'
import { Bike, CreditCard, ReceiptText, Save, ShieldCheck } from 'lucide-react'
import { getCurrencyByCountry } from '@/lib/currency'

interface Props { tenantId: string }

const COUNTRY_OPTIONS = [
  { code: 'ES', label: 'Espana' },
  { code: 'CO', label: 'Colombia' },
  { code: 'MX', label: 'Mexico' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'AR', label: 'Argentina' },
  { code: 'PE', label: 'Peru' },
  { code: 'CL', label: 'Chile' },
]

export default function DeliveryForm({ tenantId }: Props) {
  const [form, setForm] = useState({
    delivery_enabled: false,
    delivery_fee: '0',
    delivery_min_order: '0',
    delivery_time_minutes: '30',
    cash_payment_enabled: true,
    tax_rate: '0',
    country: 'ES',
    online_payment_provider: 'stripe',
    wompi_enabled: false,
    wompi_environment: 'sandbox',
    wompi_public_key: '',
    wompi_private_key: '',
    wompi_integrity_key: '',
    wompi_has_private_key: false,
    wompi_has_integrity_key: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch(`/api/tenant/delivery?tenantId=${tenantId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data) {
          setForm({
            delivery_enabled: data.data.delivery_enabled ?? false,
            delivery_fee: String(data.data.delivery_fee ?? 0),
            delivery_min_order: String(data.data.delivery_min_order ?? 0),
            delivery_time_minutes: String(data.data.delivery_time_minutes ?? 30),
            cash_payment_enabled: data.data.cash_payment_enabled ?? true,
            tax_rate: String(data.data.tax_rate ?? 0),
            country: data.data.country ?? 'ES',
            online_payment_provider: data.data.online_payment_provider ?? 'stripe',
            wompi_enabled: data.data.wompi_enabled ?? false,
            wompi_environment: data.data.wompi_environment ?? 'sandbox',
            wompi_public_key: data.data.wompi_public_key ?? '',
            wompi_private_key: '',
            wompi_integrity_key: '',
            wompi_has_private_key: data.data.wompi_has_private_key ?? false,
            wompi_has_integrity_key: data.data.wompi_has_integrity_key ?? false,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tenantId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/tenant/delivery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...form }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(`Error: ${data.error || 'No se pudo guardar'}`)
        return
      }
      setMessage('Configuracion guardada')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isColombia = String(form.country || '').toUpperCase() === 'CO'
  const currencyInfo = getCurrencyByCountry(form.country)

  if (loading) {
    return <div className="admin-empty min-h-48">Cargando configuracion de delivery...</div>
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Delivery y pagos</p>
          <h1 className="admin-title">Delivery</h1>
          <p className="admin-subtitle">Activa domicilios, efectivo, minimo de pedido e impuestos sin complicar al cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="admin-panel overflow-hidden">
        {message && (
          <div className={`border-b px-5 py-4 text-sm font-black ${message.startsWith('Configuracion') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message}
          </div>
        )}

        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-5 border-b border-black/10 p-5 xl:border-b-0 xl:border-r">
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <Bike className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-black text-[#15130f]">Delivery a domicilio</h2>
                <p className="mt-1 text-sm font-semibold text-black/45">Estos valores se muestran en la tienda y se suman al pedido.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <label className="block max-w-xs">
                    <span className="text-xs font-black uppercase text-black/42">Pais real del restaurante</span>
                    <select
                      value={form.country}
                      onChange={e => setForm(f => ({
                        ...f,
                        country: e.target.value,
                        online_payment_provider: e.target.value === 'CO' ? f.online_payment_provider : (f.online_payment_provider === 'wompi' ? 'stripe' : f.online_payment_provider),
                        wompi_enabled: e.target.value === 'CO' ? f.wompi_enabled : false,
                      }))}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                    >
                      {COUNTRY_OPTIONS.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="inline-flex rounded-full border border-black/10 bg-black/[0.04] px-3 py-2 text-xs font-black text-black/55">
                    Moneda: {currencyInfo.code}
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-black/45">
                  Esto no depende de donde abras el panel. Para ParrillaBurgers selecciona Colombia y se habilita Wompi.
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={form.delivery_enabled}
                  onChange={e => setForm(f => ({ ...f, delivery_enabled: e.target.checked }))}
                  className="peer sr-only"
                />
                <span className="h-7 w-12 rounded-full bg-black/15 transition peer-checked:bg-[#15130f]" />
                <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { key: 'delivery_fee', label: 'Monto delivery', helper: 'Ej: 4.50 o 4,50' },
                { key: 'delivery_min_order', label: 'Pedido minimo', helper: '0 = sin minimo' },
                { key: 'delivery_time_minutes', label: 'Tiempo min.', helper: 'Ej: 30' },
              ].map(({ key, label, helper }) => (
                <label key={key} className="block">
                  <span className="text-xs font-black uppercase text-black/42">{label}</span>
                  <input
                    type="text"
                    inputMode={key === 'delivery_time_minutes' ? 'numeric' : 'decimal'}
                    value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                  />
                  <span className="mt-1 block text-xs font-semibold text-black/35">{helper}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-6 p-5">
            <div className="flex gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <CreditCard className="size-5" />
              </span>
              <div className="flex-1">
                <h2 className="font-black text-[#15130f]">Metodos de pago</h2>
                <div className="mt-4 space-y-3">
                  <label className="block rounded-xl border border-black/10 bg-black/[0.03] p-4">
                    <span className="block text-sm font-black text-[#15130f]">Proveedor de pago online</span>
                    <select
                      value={form.online_payment_provider}
                      onChange={e => setForm(f => ({
                        ...f,
                        online_payment_provider: e.target.value,
                        wompi_enabled: e.target.value === 'wompi' ? f.wompi_enabled : false,
                      }))}
                      className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="wompi" disabled={!isColombia}>Wompi Colombia</option>
                      <option value="none">Sin pago online</option>
                    </select>
                    <span className="mt-2 block text-xs font-semibold text-black/45">
                      {isColombia ? 'Puedes elegir Wompi para cobrar en pesos colombianos.' : 'Wompi aparece activo solo para restaurantes registrados en Colombia.'}
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white p-4">
                    <span>
                      <span className="block text-sm font-black text-[#15130f]">Pago en efectivo</span>
                      <span className="text-xs font-semibold text-black/45">El cliente paga al recibir el pedido.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={form.cash_payment_enabled}
                      onChange={e => setForm(f => ({ ...f, cash_payment_enabled: e.target.checked }))}
                      className="size-5"
                    />
                  </label>
                </div>
              </div>
            </div>

            {isColombia && form.online_payment_provider === 'wompi' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                <div className="flex gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[#15130f] text-amber-300">
                    <ShieldCheck className="size-5" />
                  </span>
                  <div className="flex-1">
                    <h3 className="font-black text-[#15130f]">Sincronizacion Wompi</h3>
                    <p className="mt-1 text-xs font-semibold leading-5 text-black/50">
                      Pega las credenciales del comercio Wompi. Las llaves privadas se guardan en el servidor y no se muestran en la tienda.
                    </p>
                  </div>
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-black/10 bg-white p-4">
                  <span>
                    <span className="block text-sm font-black text-[#15130f]">Activar Wompi</span>
                    <span className="text-xs font-semibold text-black/45">Los clientes pagaran online por Wompi.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={form.wompi_enabled}
                    onChange={e => setForm(f => ({ ...f, wompi_enabled: e.target.checked }))}
                    className="size-5"
                  />
                </label>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/42">Ambiente</span>
                    <select
                      value={form.wompi_environment}
                      onChange={e => setForm(f => ({ ...f, wompi_environment: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                    >
                      <option value="sandbox">Pruebas</option>
                      <option value="production">Produccion</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/42">Llave publica</span>
                    <input
                      value={form.wompi_public_key}
                      onChange={e => setForm(f => ({ ...f, wompi_public_key: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      placeholder="pub_prod_..."
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/42">Llave privada</span>
                    <input
                      value={form.wompi_private_key}
                      onChange={e => setForm(f => ({ ...f, wompi_private_key: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      placeholder={form.wompi_has_private_key ? 'Guardada. Escribe solo para cambiarla.' : 'prv_prod_...'}
                      type="password"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/42">Llave de integridad</span>
                    <input
                      value={form.wompi_integrity_key}
                      onChange={e => setForm(f => ({ ...f, wompi_integrity_key: e.target.value }))}
                      className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                      placeholder={form.wompi_has_integrity_key ? 'Guardada. Escribe solo para cambiarla.' : 'Llave de integridad'}
                      type="password"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-black text-white">
                <ReceiptText className="size-5" />
              </span>
              <label className="flex-1">
                <span className="font-black text-[#15130f]">IVA / Impuesto (%)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                  className="mt-3 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-black text-[#15130f] outline-none transition focus:border-[#15130f]"
                />
                <span className="mt-1 block text-xs font-semibold text-black/35">Ej: 21 para IVA de Espana. 0 = sin impuestos.</span>
              </label>
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-black/10 p-5">
          <button type="submit" disabled={saving} className="admin-button-primary inline-flex items-center gap-2 disabled:opacity-50">
            <Save className="size-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}
