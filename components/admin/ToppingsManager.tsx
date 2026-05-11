'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Topping {
  id: string
  name: string
  price: number
  sort_order: number
}

interface Props {
  menuItemId: string
  tenantId: string
}

export default function ToppingsManager({ menuItemId, tenantId }: Props) {
  const [toppings, setToppings] = useState<Topping[]>([])
  const [loading, setLoading] = useState(true)
  const [newTopping, setNewTopping] = useState({ name: '', price: '' })
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchToppings()
  }, [menuItemId])

  const fetchToppings = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('product_toppings')
      .select('*')
      .eq('menu_item_id', menuItemId)
      .eq('tenant_id', tenantId)
      .order('sort_order')
    setToppings(data || [])
    setLoading(false)
  }

  const handleAddTopping = async () => {
    if (!newTopping.name.trim()) {
      toast.error('Ingresa el nombre del topping')
      return
    }
    if (newTopping.price && parseFloat(newTopping.price) < 0) {
      toast.error('Ingresa un precio válido')
      return
    }

    const price = newTopping.price ? parseFloat(newTopping.price) : 0

    setAdding(true)
    const { error } = await supabase.from('product_toppings').insert({
      menu_item_id: menuItemId,
      tenant_id: tenantId,
      name: newTopping.name.trim(),
      price,
      sort_order: toppings.length,
    })
    setAdding(false)

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Topping agregado')
      setNewTopping({ name: '', price: '' })
      fetchToppings()
    }
  }

  const handleDeleteTopping = async (id: string) => {
    if (!confirm('¿Eliminar este topping?')) return
    const { error } = await supabase.from('product_toppings').delete().eq('id', id)
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Topping eliminado')
      fetchToppings()
    }
  }

  const handleUpdateTopping = async (id: string, name: string, price: string) => {
    if (!name.trim() || (price && parseFloat(price) < 0)) {
      toast.error('Datos inválidos')
      return
    }

    const { error } = await supabase
      .from('product_toppings')
      .update({ name: name.trim(), price: price ? parseFloat(price) : 0 })
      .eq('id', id)

    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Topping actualizado')
      setEditingId(null)
      fetchToppings()
    }
  }

  if (loading) {
    return (
      <div className="bg-white sm:rounded-xl sm:border p-4">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white sm:rounded-xl sm:border">
      <div className="px-4 py-4 border-b">
        <h3 className="font-semibold text-gray-900">Ingredientes y adicionales</h3>
        <p className="text-xs text-gray-500 mt-1">Usa precio 0 para barra libre gratis, o agrega precio cuando sea un extra pago.</p>
      </div>

      {/* List of existing toppings */}
      {toppings.length > 0 && (
        <div className="divide-y">
          {toppings.map(topping => (
            <div key={topping.id} className="px-4 py-3">
              {editingId === topping.id ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={topping.name}
                    placeholder="Nombre"
                    id={`name-${topping.id}`}
                    className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={topping.price}
                    placeholder="Precio"
                    id={`price-${topping.id}`}
                    className="w-20 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => {
                      const nameInput = document.getElementById(`name-${topping.id}`) as HTMLInputElement
                      const priceInput = document.getElementById(`price-${topping.id}`) as HTMLInputElement
                      handleUpdateTopping(topping.id, nameInput.value, priceInput.value)
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{topping.name}</p>
                    <p className="text-sm text-gray-500">{topping.price > 0 ? `+$${topping.price.toFixed(2)}` : 'Gratis'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(topping.id)}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteTopping(topping.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new topping */}
      <div className="px-4 py-4 border-t bg-gray-50">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Agregar ingrediente o adicional</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTopping.name}
            onChange={e => setNewTopping(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre (ej: cebolla, chipotle, queso, etc.)"
            onKeyPress={e => e.key === 'Enter' && handleAddTopping()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={newTopping.price}
            onChange={e => setNewTopping(prev => ({ ...prev, price: e.target.value }))}
            placeholder="0 gratis"
            onKeyPress={e => e.key === 'Enter' && handleAddTopping()}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddTopping}
            disabled={adding}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? '...' : 'Agregar'}
          </button>
        </div>
      </div>

      {toppings.length === 0 && (
        <div className="px-4 py-8 text-center text-gray-500 text-sm">
          Sin toppings. Agrega algunos para que los clientes puedan personalizar este producto.
        </div>
      )}
    </div>
  )
}
