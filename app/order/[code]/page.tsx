'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Plus, Minus, Send } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}

interface CartItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export default function TableOrderPage() {
  const params = useParams();
  const code = params.code as string;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchQRData();
  }, [code]);

  async function fetchQRData() {
    try {
      // Find QR code by unique code
      const { data: qrCodeData, error: qrError } = await supabase
        .from('table_qr_codes')
        .select('*, tables(*), tenants(id)')
        .eq('unique_code', code)
        .single();

      if (qrError || !qrCodeData) {
        setError('Código QR inválido');
        return;
      }

      setQrData(qrCodeData);

      // Fetch menu for this restaurant
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('tenant_id', qrCodeData.tenant_id)
        .eq('available', true)
        .order('category_id, id');

      if (menuError) throw menuError;

      setMenu(menuData || []);
    } catch (err) {
      console.error('Error fetching QR data:', err);
      setError('Error al cargar el menú');
    } finally {
      setLoading(false);
    }
  }

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  }

  function removeFromCart(itemId: string) {
    setCart((prev) => prev.filter((c) => c.menu_item_id !== itemId));
  }

  function updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart((prev) =>
        prev.map((c) => (c.menu_item_id === itemId ? { ...c, quantity } : c))
      );
    }
  }

  async function submitOrder() {
    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch('/api/table-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: qrData.tenant_id,
          tableId: qrData.table_id,
          sessionId,
          uniqueCode: code,
          orderItems: cart,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar pedido');
      }

      setCart([]);
      setError('¡Pedido enviado! El personal te atenderá pronto.');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      console.error('Error submitting order:', err);
      setError('Error al enviar el pedido');
    } finally {
      setSubmitting(false);
    }
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error && !cart.length && menu.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-red-600 font-semibold text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Mesa {qrData?.tables?.table_number || '#'}
          </h1>
          <div className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-lg">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-600">{cart.length}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
        {/* Menu */}
        <div className="md:col-span-2">
          <div className="space-y-4">
            {menu.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-4 flex gap-4 hover:shadow-lg transition"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-24 h-24 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-800">{item.name}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-blue-600">
                      ${item.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-2 transition"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart */}
        <div className="sticky top-24">
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">Tu Pedido</h2>

            {error && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm">
                {error}
              </div>
            )}

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Carrito vacío</p>
            ) : (
              <>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.menu_item_id} className="border-b pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-gray-800">{item.name}</span>
                        <button
                          onClick={() => removeFromCart(item.menu_item_id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                          <button
                            onClick={() =>
                              updateQuantity(item.menu_item_id, item.quantity - 1)
                            }
                            className="text-gray-600 hover:text-gray-800 p-1"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.menu_item_id, item.quantity + 1)
                            }
                            className="text-gray-600 hover:text-gray-800 p-1"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <span className="font-bold text-blue-600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={submitOrder}
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Enviando...' : 'Enviar Pedido'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
