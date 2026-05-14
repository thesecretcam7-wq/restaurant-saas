'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, Plus, Minus, PackagePlus, X, History, ReceiptText, Search, Pencil, Trash2 } from 'lucide-react';
import { NumericKeyboard } from './NumericKeyboard';

const supabase = createClient();

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

interface StockMovement {
  id: string;
  movement_type: 'sale' | 'purchase' | 'adjustment' | 'damage' | 'return';
  quantity: number;
  notes?: string | null;
  reference_id?: string | null;
  created_by?: string | null;
  created_at: string;
  order?: {
    id: string;
    order_number: string | null;
    customer_name: string | null;
    total: number | string | null;
    created_at: string;
  } | null;
}

export function InventoryManager({ tenantId }: { tenantId: string }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [movementType, setMovementType] = useState<'purchase' | 'sale' | 'adjustment'>('purchase');
  const [quantity, setQuantity] = useState(0);
  const [showNumericKeyboard, setShowNumericKeyboard] = useState(false);

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
    const form = e.currentTarget;
    const formData = new FormData(form);
    setSavingAdd(true);
    setAddError('');

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
          initialStock: parseInt(formData.get('initialStock') as string) || 0,
          costPerUnit: parseFloat(formData.get('costPerUnit') as string),
          supplier: formData.get('supplier'),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo agregar el producto al inventario');

      form.reset();
      setShowAddForm(false);
      await fetchInventory();
    } catch (error) {
      console.error('Error adding inventory item:', error);
      setAddError(error instanceof Error ? error.message : 'No se pudo agregar el producto al inventario');
    } finally {
      setSavingAdd(false);
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

  async function updateInventoryItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData(e.currentTarget);
    setSavingEdit(true);

    try {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          productName: formData.get('productName'),
          sku: formData.get('sku'),
          minStock: parseInt(formData.get('minStock') as string) || 0,
          maxStock: parseInt(formData.get('maxStock') as string) || 0,
          costPerUnit: parseFloat(formData.get('costPerUnit') as string) || 0,
          supplier: formData.get('supplier'),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el insumo');

      setEditingItem(null);
      await fetchInventory();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo actualizar el insumo');
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteInventoryItem(item: InventoryItem) {
    const confirmed = window.confirm(
      `Vas a eliminar "${item.product_name}" del inventario. Si esta usado en recetas, tambien se quitara de esas recetas. Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingItemId(item.id);
    try {
      const response = await fetch(`/api/inventory/${item.id}?tenantId=${tenantId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el insumo');

      await fetchInventory();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo eliminar el insumo');
    } finally {
      setDeletingItemId(null);
    }
  }

  async function openMovements(item: InventoryItem) {
    setMovementItem(item);
    setLoadingMovements(true);
    try {
      const response = await fetch(`/api/inventory/${item.id}/stock-movement?tenantId=${tenantId}`, {
        credentials: 'include',
      });
      const data = await response.json();
      setMovements(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= 0) return { status: 'Agotado', color: 'bg-red-100 text-red-900' };
    if (current <= min) return { status: 'Bajo', color: 'bg-yellow-100 text-yellow-900' };
    if (current >= max) return { status: 'Exceso', color: 'bg-orange-100 text-orange-900' };
    return { status: 'OK', color: 'bg-green-100 text-green-900' };
  };

  if (loading) {
    return <div className="admin-empty">Cargando inventario...</div>;
  }

  const lowStockItems = inventory.filter((item) => item.current_stock <= item.min_stock);
  const outOfStockItems = inventory.filter((item) => item.current_stock <= 0);
  const nearLowStockItems = lowStockItems.filter((item) => item.current_stock > 0);
  const totalInventoryValue = inventory.reduce(
    (sum, item) => sum + item.current_stock * item.cost_per_unit,
    0
  );
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredInventory = normalizedSearch
    ? inventory.filter((item) =>
        [
          item.product_name,
          item.sku,
          item.supplier,
        ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch))
      )
    : inventory;

  return (
    <div>
      <div>
        {/* Header */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-[#15130f]">Resumen de stock</h2>
            <p className="text-sm font-semibold text-black/52 mt-1">
              Valor total: <span className="font-bold">${totalInventoryValue.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={() => {
              setAddError('');
              setShowAddForm(true);
            }}
            className="admin-button-primary"
          >
            <Plus className="w-5 h-5" /> Agregar Producto
          </button>
        </div>

        {/* Alerts */}
        {lowStockItems.length > 0 && (
          <div className="mb-5 grid gap-3 lg:grid-cols-2">
            {outOfStockItems.length > 0 && (
              <div className="admin-panel border-red-200 bg-red-50/90 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-black text-red-950">Agotados</h3>
                    <p className="text-red-800 text-sm font-semibold">{outOfStockItems.length} insumo{outOfStockItems.length > 1 ? 's' : ''} sin stock.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {outOfStockItems.slice(0, 8).map((item) => (
                        <span key={item.id} className="rounded-full border border-red-200 bg-white/70 px-3 py-1 text-xs font-black text-red-800">
                          {item.product_name}: {item.current_stock}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {nearLowStockItems.length > 0 && (
              <div className="admin-panel border-amber-200 bg-amber-50/90 p-5">
                <div className="flex gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-black text-yellow-950">Stock bajo</h3>
                    <p className="text-yellow-800 text-sm font-semibold">{nearLowStockItems.length} insumo{nearLowStockItems.length > 1 ? 's' : ''} por debajo del minimo.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nearLowStockItems.slice(0, 8).map((item) => (
                        <span key={item.id} className="rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-black text-yellow-900">
                          {item.product_name}: {item.current_stock}/{item.min_stock}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Add Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center">
            <div className="admin-panel my-4 w-full max-w-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-white/70 px-6 py-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#15130f] text-white shadow-sm">
                    <PackagePlus className="size-5" />
                  </span>
                  <div>
                    <p className="admin-eyebrow">Nuevo insumo</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-[#15130f]">Agregar producto al inventario</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-black/52">
                      Define stock minimo, maximo, costo y proveedor para controlar alertas y movimientos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={addInventoryItem} className="space-y-5 p-6">
                {addError && (
                  <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
                    {addError}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-black/45">Producto *</label>
                  <input
                    type="text"
                    name="productName"
                    placeholder="Ej. Queso mozzarella, harina, salsa base"
                    required
                    className="admin-input"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">SKU</label>
                    <input
                      type="text"
                      name="sku"
                      placeholder="Opcional"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Proveedor</label>
                    <input
                      type="text"
                      name="supplier"
                      placeholder="Opcional"
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Stock inicial</label>
                    <input
                      type="number"
                      name="initialStock"
                      min="0"
                      placeholder="0"
                      defaultValue="0"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Stock minimo</label>
                    <input
                      type="number"
                      name="minStock"
                      min="0"
                      placeholder="5"
                      defaultValue="5"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Stock maximo</label>
                    <input
                      type="number"
                      name="maxStock"
                      min="0"
                      placeholder="100"
                      defaultValue="100"
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Costo unitario *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="costPerUnit"
                      placeholder="0.00"
                      required
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3">
                  <p className="text-xs font-semibold leading-5 text-black/52">
                    El sistema usara el stock minimo para alertarte cuando sea momento de reponer. Puedes ajustar existencias despues con movimientos de compra, venta o ajuste.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={savingAdd}
                    className="admin-button-ghost sm:w-auto disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingAdd}
                    className="admin-button-primary sm:w-auto disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                    {savingAdd ? 'Guardando...' : 'Agregar al inventario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm sm:items-center">
            <div className="admin-panel my-4 w-full max-w-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-white/70 px-6 py-5">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#15130f] text-white shadow-sm">
                    <Pencil className="size-5" />
                  </span>
                  <div>
                    <p className="admin-eyebrow">Editar insumo</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-[#15130f]">{editingItem.product_name}</h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-black/52">
                      Ajusta nombre, codigo, proveedor, alertas y costo. El stock actual se modifica con movimientos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={updateInventoryItem} className="space-y-5 p-6">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase text-black/45">Producto *</label>
                  <input
                    type="text"
                    name="productName"
                    defaultValue={editingItem.product_name}
                    required
                    className="admin-input"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">SKU / codigo de barras</label>
                    <input
                      type="text"
                      name="sku"
                      defaultValue={editingItem.sku || ''}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Proveedor</label>
                    <input
                      type="text"
                      name="supplier"
                      defaultValue={editingItem.supplier || ''}
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Stock minimo</label>
                    <input
                      type="number"
                      name="minStock"
                      min="0"
                      defaultValue={editingItem.min_stock}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Stock maximo</label>
                    <input
                      type="number"
                      name="maxStock"
                      min="0"
                      defaultValue={editingItem.max_stock}
                      className="admin-input"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase text-black/45">Costo unitario *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="costPerUnit"
                      defaultValue={editingItem.cost_per_unit}
                      required
                      className="admin-input"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold leading-5 text-amber-900">
                    Stock actual: {editingItem.current_stock}. Para corregir cantidad usa Compra o Venta, asi queda registrado en movimientos.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-black/10 pt-5 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={() => deleteInventoryItem(editingItem)}
                    disabled={deletingItemId === editingItem.id || savingEdit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50 sm:w-auto"
                  >
                    <Trash2 className="size-4" />
                    {deletingItemId === editingItem.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                  <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="admin-button-ghost sm:w-auto"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="admin-button-primary sm:w-auto disabled:opacity-50"
                    >
                      <Pencil className="size-4" />
                      {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Movement Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <div className="admin-panel max-w-md w-full mx-4 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar Movimiento de Stock</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Movimiento
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as any)}
                    className="admin-input"
                  >
                    <option value="purchase">Compra</option>
                    <option value="sale">Venta</option>
                    <option value="adjustment">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cantidad Recibida
                  </label>
                  <button
                    onClick={() => setShowNumericKeyboard(true)}
                    className="w-full px-4 py-3 border-2 border-blue-500 rounded-lg text-2xl font-bold text-blue-600 hover:bg-blue-50 transition"
                  >
                    {quantity > 0 ? quantity : 'Ingresa cantidad'}
                  </button>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={recordStockMovement}
                    className="admin-button-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={quantity === 0}
                  >
                    Registrar
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setQuantity(0);
                      setShowNumericKeyboard(false);
                    }}
                    className="admin-button-ghost flex-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Numeric Keyboard Modal */}
        <NumericKeyboard
          isOpen={showNumericKeyboard}
          title="Ingresa Cantidad Recibida"
          initialValue={quantity}
          onConfirm={(value) => {
            setQuantity(value);
            setShowNumericKeyboard(false);
          }}
          onCancel={() => setShowNumericKeyboard(false)}
          allowDecimal={false}
        />

        {movementItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="admin-panel max-h-[86vh] w-full max-w-3xl overflow-hidden">
              <div className="flex items-start justify-between gap-4 border-b border-black/10 bg-white/70 px-6 py-5">
                <div>
                  <p className="admin-eyebrow">Kardex</p>
                  <h2 className="text-2xl font-black tracking-tight text-[#15130f]">{movementItem.product_name}</h2>
                  <p className="mt-1 text-sm font-semibold text-black/52">Stock actual: {movementItem.current_stock}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMovementItem(null);
                    setMovements([]);
                  }}
                  className="rounded-lg p-2 text-black/45 transition hover:bg-black/5 hover:text-black"
                  aria-label="Cerrar"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="max-h-[60vh] overflow-y-auto">
                {loadingMovements ? (
                  <div className="admin-empty m-5">Cargando movimientos...</div>
                ) : movements.length === 0 ? (
                  <div className="admin-empty m-5">
                    <History className="mb-3 size-8 text-black/24" />
                    <p className="font-black text-[#15130f]">Sin movimientos</p>
                    <p className="mt-1 text-sm">Este ingrediente todavia no tiene compras, ajustes o ventas asociadas.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/8">
                    {movements.map((movement) => {
                      const isOut = movement.movement_type === 'sale' || movement.movement_type === 'damage';
                      const movementLabel: Record<string, string> = {
                        sale: 'Venta',
                        purchase: 'Compra',
                        adjustment: 'Ajuste',
                        damage: 'Merma',
                        return: 'Devolucion',
                      };
                      return (
                        <div key={movement.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isOut ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                {movementLabel[movement.movement_type] || movement.movement_type}
                              </span>
                              <span className="text-xs font-bold text-black/42">
                                {new Date(movement.created_at).toLocaleString('es-CO', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-bold text-[#15130f]">
                              {movement.order?.order_number ? `Pedido ${movement.order.order_number}` : movement.notes || 'Movimiento manual'}
                            </p>
                            {movement.order?.customer_name && (
                              <p className="mt-0.5 text-xs font-semibold text-black/45">
                                Cliente: {movement.order.customer_name} - Total ${Number(movement.order.total || 0).toLocaleString('es-CO')}
                              </p>
                            )}
                            {movement.reference_id && !movement.order?.order_number && (
                              <p className="mt-0.5 text-xs font-semibold text-black/35">Referencia: {movement.reference_id}</p>
                            )}
                          </div>
                          <p className={`text-right text-lg font-black ${isOut ? 'text-red-600' : 'text-emerald-700'}`}>
                            {isOut ? '-' : '+'}{Number(movement.quantity).toLocaleString('es-CO')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="admin-panel overflow-hidden border-[#d9a441]/28 bg-[#15120d]/92">
          <div className="border-b border-[#d9a441]/18 bg-white/[0.04] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-black text-[#fff4d8]">Inventario</h3>
                <p className="text-xs font-semibold text-[#fff4d8]/58">
                  {filteredInventory.length} de {inventory.length} insumo{inventory.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#f2cf82]/70" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por nombre o codigo de barras"
                    className="admin-input border-[#d9a441]/25 bg-white/[0.08] pl-10 text-[#fff4d8] placeholder:text-[#fff4d8]/45"
                  />
                </div>
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="admin-button-ghost whitespace-nowrap sm:w-auto"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-[#d9a441]/18 bg-[#080704]/70">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Producto</th>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Stock Actual</th>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Min - Max</th>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Costo Unit.</th>
                <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-[0.12em] text-[#f2cf82]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d9a441]/12">
              {filteredInventory.map((item) => {
                const stockStatus = getStockStatus(item.current_stock, item.min_stock, item.max_stock);
                return (
                  <tr key={item.id} className="transition hover:bg-[#d9a441]/8">
                    <td className="px-6 py-4">
                      <p className="font-black text-[#fff4d8]">{item.product_name}</p>
                      {item.sku && <p className="text-sm font-semibold text-[#fff4d8]/52">SKU: {item.sku}</p>}
                    </td>
                    <td className="px-6 py-4 font-black text-[#fff4d8]">{item.current_stock}</td>
                    <td className="px-6 py-4 font-semibold text-[#fff4d8]/65">
                      {item.min_stock} - {item.max_stock}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-[#f2cf82]">${item.cost_per_unit.toFixed(2)}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="flex items-center gap-1 rounded border border-[#d9a441]/25 bg-white/[0.08] px-3 py-1 text-sm font-black text-[#fff4d8] transition hover:bg-white/[0.14]"
                      >
                        <Pencil className="w-4 h-4" /> Editar
                      </button>
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
                      <button
                        onClick={() => openMovements(item)}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition"
                      >
                        <ReceiptText className="w-4 h-4" /> Movimientos
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredInventory.length === 0 && (
            <div className="m-5 rounded-2xl border border-[#d9a441]/18 bg-white/[0.04] p-10 text-center">
              <Search className="mx-auto mb-3 size-8 text-[#f2cf82]/70" />
              <p className="font-black text-[#fff4d8]">No se encontraron insumos</p>
              <p className="mt-1 text-sm font-semibold text-[#fff4d8]/55">Prueba con otro nombre, SKU o codigo de barras.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
