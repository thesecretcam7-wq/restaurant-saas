'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowLeft, Delete } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  role: 'cocinero' | 'camarero' | 'cajero';
}

const ROLE_CONFIG = {
  cocinero: {
    label: 'Cocinero',
    apiRole: 'kitchen',
    icon: '🍳',
    color: 'emerald',
  },
  camarero: {
    label: 'Camarero',
    apiRole: 'waiter',
    icon: '👨‍💼',
    color: 'emerald',
  },
  cajero: {
    label: 'Cajero',
    apiRole: 'waiter', // Comparte PIN con camarero
    icon: '💳',
    color: 'indigo',
  },
};

export function RoleLoginClient({ tenantId, tenantName, tenantSlug, logoUrl, role }: Props) {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const config = ROLE_CONFIG[role];

  async function validatePin(p: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: tenantSlug,
          pin: p,
          role: config.apiRole,
        }),
      });

      if (res.ok) {
        // Set role in sessionStorage to show appropriate portal
        sessionStorage.setItem('staff_role', role);
        sessionStorage.setItem('staff_tenant', tenantId);
        // Set httpOnly cookie
        await fetch('/api/staff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });
        // Redirect to role portal
        router.push(`/${tenantId}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) {
        setError('Esta función requiere plan Pro o Premium.');
        return;
      }
      setError('PIN incorrecto. Inténtalo de nuevo.');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setPin('');
    }
  }

  function pressKey(key: string) {
    if (loading) return;
    setError('');
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    setPin(next);
    if (next.length >= 6) validatePin(next);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 p-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-8 text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
        ) : (
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
        )}
        <p className="text-gray-400 text-sm">{tenantName}</p>
        <p className="text-white font-bold text-xl mt-1">{config.label}</p>
      </div>

      <div className="flex gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
              i < pin.length ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600 bg-gray-800'
            }`}
          >
            {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
          </div>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
      {loading && <p className="text-gray-400 text-sm mb-4">Verificando...</p>}

      <div className="grid grid-cols-3 gap-3 w-64">
        {['1','2','3','4','5','6','7','8','9','','0','del'].map((key) => {
          if (key === '') return <div key="empty" />;
          return (
            <button
              key={key}
              onClick={() => pressKey(key)}
              disabled={loading}
              className={`h-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95 ${
                key === 'del'
                  ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {key === 'del' ? <Delete className="w-5 h-5" /> : key}
            </button>
          );
        })}
      </div>

      <p className="text-gray-600 text-xs mt-8 text-center">Ingresa tu PIN de 4–6 dígitos</p>
    </div>
  );
}
