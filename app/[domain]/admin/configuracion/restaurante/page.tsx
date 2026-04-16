'use client'

import { use, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props { params: Promise<{ domain: string }> }

async function getTenantIdFromSlugClient(slug: string) {
  const supabase = createClient()
  const { data } = await supabase.from('tenants').select('id').eq('slug', slug).single()
  return data?.id || null
}

export default function RestauranteConfigPage({ params }: Props) {
  const { domain: slug } = use(params)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    display_name: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    city: '',
    country: 'CO',
    timezone: 'America/Bogota',
    delivery_enabled: false,
    delivery_fee: '0',
    delivery_min_order: '0',
    delivery_time_minutes: '30',
    reservations_enabled: false,
    total_tables: '10',
    seats_per_table: '4',
    cash_payment_enabled: true,
    tax_rate: '0',
  })

  useEffect(() => {
    const initializeTenantId = async () => {
      const resolvedTenantId = await getTenantIdFromSlugClient(slug)
      setTenantId(resolvedTenantId)
    }
    initializeTenantId()
  }, [slug])

  useEffect(() => {
    if (!tenantId) return
    const supabase = createClient()
    supabase.from('restaurant_settings').select('*').eq('tenant_id', tenantId).single().then(({ data }) => {
      if (data) {
        setForm({
          display_name: data.display_name || '',
          description: data.description || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          city: data.city || '',
          country: data.country || 'CO',
          timezone: data.timezone || 'America/Bogota',
          delivery_enabled: data.delivery_enabled,
          delivery_fee: String(data.delivery_fee),
          delivery_min_order: String(data.delivery_min_order),
          delivery_time_minutes: String(data.delivery_time_minutes),
          reservations_enabled: data.reservations_enabled,
          total_tables: String(data.total_tables),
          seats_per_table: String(data.seats_per_table),
          cash_payment_enabled: data.cash_payment_enabled,
          tax_rate: String(data.tax_rate),
        })
      }
      setLoading(false)
    }).catch(() => {
      // Tabla no existe aún, valores por defecto están bien
      setLoading(false)
    })
  }, [tenantId])

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('restaurant_settings').upsert({
        tenant_id: tenantId,
        display_name: form.display_name,
        description: form.description || null,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        city: form.city || null,
        country: form.country,
        timezone: form.timezone,
        delivery_enabled: form.delivery_enabled,
        delivery_fee: parseFloat(form.delivery_fee),
        delivery_min_order: parseFloat(form.delivery_min_order),
        delivery_time_minutes: parseInt(form.delivery_time_minutes),
        reservations_enabled: form.reservations_enabled,
        total_tables: parseInt(form.total_tables),
        seats_per_table: parseInt(form.seats_per_table),
        cash_payment_enabled: form.cash_payment_enabled,
        tax_rate: parseFloat(form.tax_rate),
      }, { onConflict: 'tenant_id' })
      setSaving(false)
      if (!error) toast.success('Configuración guardada')
      else toast.error('Error al guardar: ' + error.message)
    } catch (err) {
      setSaving(false)
      toast.error('Error al guardar')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Cargando...</div>

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={form[key] as string}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  const toggle = (label: string, desc: string, key: keyof typeof form) => (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={form[key] as boolean}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
          className="sr-only peer"
        />
        <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </label>
  )

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 text-sm mt-1">Información y opciones del restaurante</p>
      </div>

      <div className="space-y-6">
        {/* Info General */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Información General</h2>
          {field('Nombre del restaurante *', 'display_name', 'text', 'Mi Restaurante')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Breve descripción de tu restaurante..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Teléfono', 'phone', 'tel', '+57 300 000 0000')}
            {field('Email', 'email', 'email', 'info@mirestaurante.com')}
          </div>
          {field('Dirección', 'address', 'text', 'Calle 123 #45-67')}
          {field('Ciudad', 'city', 'text', 'Bogotá')}
        </div>

        {/* Pagos */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Pagos</h2>
          {toggle('Pagos en efectivo', 'Permite que los clientes paguen con efectivo al recibir', 'cash_payment_enabled')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto / IVA (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={form.tax_rate}
              onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
              className="w-40 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">Porcentaje que se suma al subtotal. Pon 0 para no cobrar impuesto.</p>
          </div>
        </div>

        {/* Delivery */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Delivery</h2>
          {toggle('Habilitar delivery', 'Los clientes podrán seleccionar entrega a domicilio', 'delivery_enabled')}
          {form.delivery_enabled && (
            <div className="grid grid-cols-3 gap-4 pl-4 pt-2 border-l-2 border-blue-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Costo ($)</label>
                <input type="number" min="0" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: e.target.value }))}
                  className="w-full px-2 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mínimo ($)</label>
                <input type="number" min="0" value={form.delivery_min_order} onChange={e => setForm(f => ({ ...f, delivery_min_order: e.target.value }))}
                  className="w-full px-2 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo (min)</label>
                <input type="number" min="0" value={form.delivery_time_minutes} onChange={e => setForm(f => ({ ...f, delivery_time_minutes: e.target.value }))}
                  className="w-full px-2 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Reservas */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <h2 className="font-semibold">Reservas</h2>
          {toggle('Habilitar reservas', 'Los clientes podrán hacer reservas de mesas', 'reservations_enabled')}
          {form.reservations_enabled && (
            <div className="grid grid-cols-2 gap-4 pl-4 pt-2 border-l-2 border-blue-100">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Total mesas</label>
                <input type="number" min="1" value={form.total_tables} onChange={e => setForm(f => ({ ...f, total_tables: e.target.value }))}
                  className="w-full px-2 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sillas por mesa</label>
                <input type="number" min="1" value={form.seats_per_table} onChange={e => setForm(f => ({ ...f, seats_per_table: e.target.value }))}
                  className="w-full px-2 py-2 border rounded-lg text-sm" />
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300"
        >
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
