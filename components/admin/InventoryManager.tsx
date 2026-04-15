'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, Plus, Minus, TrendingDown, AlertCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface InventoryItem {
  id: string;
  product_name: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  cost_per_unit: number;
  sku?: string;
  supplier?: string;
}

interface StockAlert {
  id: string;
  inventory_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'overstock';
  is_resolved: boolean;
}

export function InventoryManager({ tenantId }: { tenantId: string }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<'purchase' | 'sale' | 'adjustment'>('purchase');
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    fetchInventory();
  }, [tenantId]);

  async function fetchInventory() {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/inventory?tenantId=${tenantId}&includeAlerts=true`,
        { credentials: 'include' }
      );
      const data = await response.json();

      if (data.inventory) setInventory(data.inventory);
      if (data.alerts) setAlerts(data.alerts);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addInventoryItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          productName: formData.get('productName'),
          sku: formData.get('sku'),
          minStock: parseInt(formData.get('minStock') as string) || 5,
          maxStock: parseInt(formData.get('maxStock') as string) || 100,
          costPerUnit: parseFloat(formData.get('costPerUnit') as string),
          supplier: formData.get('supplier'),
        }),
      });

      if (!response.ok) throw new Error('Failed to add item');

      setShowAddForm(false);
      await fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
    }
  }

  async function recordStockMovement() {
    if (!selectedItem || !quantity) return;

    try {
      const response = await fetch(`/api/inventory/${selectedItem}/stock-movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          movementType,
          quantity,
          notes: '',
        }),
      });

      if (!response.ok) throw new Error('Failed to record movement');

      setSelectedItem(null);
      setQuantity(0);
      await fetchInventory();
    } catch (error) {
      console.error('Error recording movement:', error);
    }
  }

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= 0) return { status: 'Agotado', color: 'bg-red-100 text-red-900' };
    if (current <= min) return { status: 'Bajo', color: 'bg-yellow-100 text-yellow-900' };
    if (current >= max) return { status: 'Exceso', color: 'bg-orange-100 text-orange-900' };
    return { status: 'OK', color: 'bg-green-100 text-green-900' };
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando inventario...</div>;
  }

  const lowStockItems = inventory.filter((item) => item.current_stock <= item.min_stock);
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.current_stock * item.cost_per_unit,
    0
  );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
            <p className="text-gray-600 mt-1">
              Valor total: <span className="font-bold">${totalInventoryValue.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <Plus className="w-5 h-5" /> Agregar Producto
          </button>
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
            <div className="flex gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-yellow-900">Stock Bajo</h3>
                <p className="text-yellow-800 text-sm">
                  {lowStockItems.length} producto{lowStockItems.length > 1 ? 's' : ''} con stock
                  bajo:
                </p>
                <div className="mt-2 space-y-1">
                  {lowStockItems.map((item) => (
                    <p key={item.id} className="text-sm text-yellow-800">
                      • {item.product_name}: {item.current_stock} unidades
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Agregar Producto al Inventario</h2>
              <form onSubmit={addInventoryItem} className="space-y-4">
                <input
                  type="text"
                  name="productName"
                  placeholder="Nombre del producto"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  name="sku"
                  placeholder="SKU (opcional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  name="minStock"
                  placeholder="Stock Mínimo"
                  defaultValue="5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  name="maxStock"
                  placeholder="Stock Máximo"
                  defaultValue="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  name="costPerUnit"
                  placeholder="Costo por Unidad"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <input
                  type="text"
                  name="supplier"
                  placeholder="Proveedor (opcional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Agregar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Movement Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar Movimiento de Stock</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="purchase">Compra</option>
                    <option value="sale">Venta</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Cantidad"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={recordStockMovement}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition"
                  >
                    Registrar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setQuantity(0);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Producto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Stock Actual</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Mín - Máx</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Costo Unit.</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item.current_stock, item.min_stock, item.max_stock);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      {item.sku && <p className="text-sm text-gray-600">SKU: {item.sku}</p>}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{item.current_stock}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {item.min_stock} - {item.max_stock}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-900">${item.cost_per_unit.toFixed(2)}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedItem(item.id);
                          setMovementType('purchase');
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition"
                      >
                        <Plus className="w-4 h-4" /> Compra
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(item.id);
                          setMovementType('sale');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition"
                      >
                        <Minus className="w-4 h-4" /> Venta
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
