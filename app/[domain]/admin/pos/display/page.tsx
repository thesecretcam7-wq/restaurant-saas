'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { UtensilsCrossed } from 'lucide-react';

interface CartItem {
  name: string;
  price: number;
  quantity: number;
}

interface PosCart {
  items: CartItem[];
  subtotal: number;
  total: number;
  discount: number;
  updated_at: string;
}

function formatCOP(amount: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export default function CustomerDisplayPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tid');

  const [cart, setCart] = useState<PosCart | null>(null);
  const [time, setTime] = useState(new Date());

  const supabase = useMemo(() =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []
  );

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Real-time cart subscription
  useEffect(() => {
    if (!tenantId) return;

    async function fetchCart() {
      const { data } = await supabase
        .from('pos_carts')
        .select('items, subtotal, total, discount, updated_at')
        .eq('tenant_id', tenantId)
        .is('abandoned_at', null)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (data && data.items && data.items.length > 0) {
        setCart(data as PosCart);
      } else {
        setCart(null);
      }
    }

    fetchCart();

    const channel = supabase
      .channel(`customer-display:${tenantId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pos_carts',
        filter: `tenant_id=eq.${tenantId}`,
      }, fetchCart)
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [tenantId, supabase]);

  const hasItems = cart && cart.items && cart.items.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-8 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 rounded-xl p-2 border border-white/20">
            <UtensilsCrossed className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-black text-xl tracking-wide">Eccofood</span>
        </div>
        <div className="text-white/70 text-sm font-mono">
          {time.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {!hasItems ? (
        /* Welcome screen */
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="text-8xl mb-2">🍽️</div>
          <h1 className="text-4xl font-black text-white tracking-wide">¡Bienvenido!</h1>
          <p className="text-gray-400 text-xl">Estamos preparando su pedido</p>
        </div>
      ) : (
        /* Active cart */
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-8 py-8 gap-6">
          <h2 className="text-2xl font-black text-white">Su pedido</h2>

          {/* Items list */}
          <div className="flex-1 space-y-3">
            {cart!.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span className="bg-blue-600 text-white font-black text-sm w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <span className="text-white font-semibold text-lg">{item.name}</span>
                </div>
                <span className="text-green-400 font-black text-lg">
                  {formatCOP(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-3">
            {cart!.discount > 0 && (
              <div className="flex justify-between text-gray-400 text-base">
                <span>Subtotal</span>
                <span>{formatCOP(cart!.subtotal)}</span>
              </div>
            )}
            {cart!.discount > 0 && (
              <div className="flex justify-between text-green-400 text-base font-semibold">
                <span>Descuento</span>
                <span>-{formatCOP(cart!.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
              <span className="text-white font-black text-2xl">TOTAL</span>
              <span className="text-green-400 font-black text-3xl tabular-nums">
                {formatCOP(cart!.total)}
              </span>
            </div>
          </div>

          <p className="text-center text-gray-600 text-sm">Gracias por elegirnos</p>
        </div>
      )}
    </div>
  );
}
