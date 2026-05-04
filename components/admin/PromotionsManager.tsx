'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Gift, Plus, Copy, Trash2, Calendar } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Promotion {
  id: string;
  name: string;
  description?: string;
  promotion_type: 'percentage' | 'fixed' | 'buy_one_get_one';
  value: number;
  max_discount?: number;
  min_order_value?: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  current_uses: number;
  max_uses?: number;
}

interface DiscountCode {
  id: string;
  code: string;
  promotion_id: string;
  max_uses?: number;
  current_uses: number;
  is_active: boolean;
}

export function PromotionsManager({ tenantId }: { tenantId: string }) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddCodeForm, setShowAddCodeForm] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null);
  const [tab, setTab] = useState<'promotions' | 'codes'>('promotions');

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    try {
      const [promoRes, codesRes] = await Promise.all([
        fetch(`/api/promotions?tenantId=${tenantId}`, { credentials: 'include' }),
        fetch(`/api/discount-codes?tenantId=${tenantId}`, { credentials: 'include' }).catch(
          () => new Response(JSON.stringify({}), { status: 400 })
        ),
      ]);

      if (promoRes.ok) setPromotions(await promoRes.json());
      if (codesRes.ok) setDiscountCodes(await codesRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addPromotion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          name: formData.get('name'),
          description: formData.get('description'),
          promotionType: formData.get('promotionType'),
          value: parseFloat(formData.get('value') as string),
          maxDiscount: formData.get('maxDiscount')
            ? parseFloat(formData.get('maxDiscount') as string)
            : null,
          minOrderValue: formData.get('minOrderValue')
            ? parseFloat(formData.get('minOrderValue') as string)
            : null,
          validFrom: formData.get('validFrom'),
          validUntil: formData.get('validUntil'),
          maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to add promotion');

      setShowAddForm(false);
      await fetchData();
    } catch (error) {
      console.error('Error adding promotion:', error);
    }
  }

  async function addDiscountCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPromotion) return;

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/discount-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tenantId,
          promotionId: selectedPromotion,
          code: formData.get('code'),
          maxUses: formData.get('maxUses') ? parseInt(formData.get('maxUses') as string) : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to add discount code');

      setShowAddCodeForm(false);
      setSelectedPromotion(null);
      await fetchData();
    } catch (error) {
      console.error('Error adding discount code:', error);
    }
  }

  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage':
        return '%';
      case 'fixed':
        return '$';
      case 'buy_one_get_one':
        return 'BOGO';
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Cargando promociones...</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Promociones y Descuentos</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b">
          <button
            onClick={() => setTab('promotions')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              tab === 'promotions'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Gift className="w-5 h-5 inline mr-2" /> Promociones
          </button>
          <button
            onClick={() => setTab('codes')}
            className={`px-6 py-3 font-semibold border-b-2 transition ${
              tab === 'codes'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Copy className="w-5 h-5 inline mr-2" /> Códigos de Descuento
          </button>
        </div>

        {/* Promotions Tab */}
        {tab === 'promotions' && (
          <div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mb-6 transition"
            >
              <Plus className="w-5 h-5" /> Agregar Promoción
            </button>

            {showAddForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Agregar Promoción</h2>
                  <form onSubmit={addPromotion} className="space-y-3">
                    <input
                      type="text"
                      name="name"
                      placeholder="Nombre de la Promoción"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <textarea
                      name="description"
                      placeholder="Descripción (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      rows={2}
                    />
                    <select
                      name="promotionType"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    >
                      <option value="">Tipo de Promoción</option>
                      <option value="percentage">Porcentaje (%)</option>
                      <option value="fixed">Monto Fijo ($)</option>
                      <option value="buy_one_get_one">Compra Uno Lleva Dos</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      name="value"
                      placeholder="Valor"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="maxDiscount"
                      placeholder="Descuento Máximo (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      step="0.01"
                      name="minOrderValue"
                      placeholder="Monto Mínimo (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="datetime-local"
                      name="validFrom"
                      placeholder="Válido Desde"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="datetime-local"
                      name="validUntil"
                      placeholder="Válido Hasta"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <input
                      type="number"
                      name="maxUses"
                      placeholder="Usos Máximos (opcional)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition text-sm"
                      >
                        Agregar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition text-sm"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {promotions.map((promo) => (
                <div key={promo.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900">{promo.name}</h3>
                      {promo.description && (
                        <p className="text-sm text-gray-600 mt-1">{promo.description}</p>
                      )}
                    </div>
                    <span className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg font-bold text-lg">
                      {getPromotionTypeLabel(promo.promotion_type)} {promo.value}
                      {promo.max_discount && ` (Máx: $${promo.max_discount})`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Desde</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(promo.valid_from).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Hasta</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(promo.valid_until).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Usos</p>
                      <p className="font-semibold text-gray-900">
                        {promo.current_uses}{promo.max_uses ? `/${promo.max_uses}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Estado</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          promo.is_active
                            ? 'bg-green-100 text-green-900'
                            : 'bg-red-100 text-red-900'
                        }`}
                      >
                        {promo.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discount Codes Tab */}
        {tab === 'codes' && (
          <div>
            <button
              onClick={() => setShowAddCodeForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mb-6 transition"
            >
              <Plus className="w-5 h-5" /> Agregar Código
            </button>

            {showAddCodeForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Agregar Código de Descuento</h2>
                  <form onSubmit={addDiscountCode} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Promoción
                      </label>
                      <select
                        value={selectedPromotion || ''}
                        onChange={(e) => setSelectedPromotion(e.target.value)}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Seleccionar Promoción</option>
                        {promotions.map((promo) => (
                          <option key={promo.id} value={promo.id}>
                            {promo.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      name="code"
                      placeholder="Código (ej: SUMMER20)"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <input
                      type="number"
                      name="maxUses"
                      placeholder="Usos Máximos (opcional)"
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
                        onClick={() => {
                          setShowAddCodeForm(false);
                          setSelectedPromotion(null);
                        }}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Promoción
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Usos
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {discountCodes.map((code) => {
                    const promo = promotions.find((p) => p.id === code.promotion_id);
                    return (
                      <tr key={code.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-bold text-gray-900">{code.code}</td>
                        <td className="px-6 py-4 text-gray-600">{promo?.name}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              code.is_active
                                ? 'bg-green-100 text-green-900'
                                : 'bg-red-100 text-red-900'
                            }`}
                          >
                            {code.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
