'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Monitor, ClipboardList, CreditCard, LogOut, Delete } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
}

const SESSION_KEY = 'staff_authed';

export function StaffClient({ tenantId, tenantName, tenantSlug, logoUrl }: Props) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === tenantId) setAuthed(true);
    setChecking(false);
  }, [tenantId]);

  async function validatePin(p: string) {
    setLoading(true);
    setError('');
    try {
      for (const role of ['waiter', 'kitchen']) {
        const res = await fetch('/api/staff/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: tenantSlug, pin: p, role }),
        });
        if (res.ok) {
          // Set httpOnly cookie so admin panel blocks access on this device
          await fetch('/api/staff/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId }),
          });
          sessionStorage.setItem(SESSION_KEY, tenantId);
          setAuthed(true);
          return;
        }
        const data = await res.json();
        if (data.requiresUpgrade) {
          setError('Esta función requiere plan Pro o Premium.');
          return;
        }
      }
      setError('PIN incorrecto. Inténtalo de nuevo.');
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
      setPin('');
    }
  }

  async function logout() {
    await fetch('/api/staff/session', { method: 'DELETE' });
    sessionStorage.removeItem(SESSION_KEY);
    setAuthed(false);
    setPin('');
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

  if (checking) return null;

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
        <div className="mb-8 text-center">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
          ) : (
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ChefHat className="w-8 h-8 text-white" />
            </div>
          )}
          <p className="text-white font-bold text-lg">{tenantName}</p>
          <p className="text-gray-400 text-sm mt-1">Acceso de Personal</p>
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

  const tools = [
    {
      path: `/${tenantId}/staff/pos`,
      icon: <CreditCard className="w-10 h-10" />,
      label: 'TPV',
      desc: 'Punto de venta y cobros',
      color: 'from-indigo-600 to-indigo-700',
      bg: 'bg-indigo-950',
    },
    {
      path: `/${tenantId}/staff/kds`,
      icon: <Monitor className="w-10 h-10" />,
      label: 'KDS',
      desc: 'Display de cocina',
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-950',
    },
    {
      path: `/${tenantId}/kitchen`,
      icon: <ClipboardList className="w-10 h-10" />,
      label: 'Comandero',
      desc: 'Tomar pedidos de mesa',
      color: 'from-emerald-600 to-emerald-700',
      bg: 'bg-emerald-950',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-white font-bold text-sm">{tenantName}</p>
            <p className="text-gray-400 text-xs">Panel de Personal</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <p className="text-gray-400 text-sm mb-2">Selecciona una herramienta</p>
        {tools.map(tool => (
          <button
            key={tool.path}
            onClick={() => router.push(tool.path)}
            className={`w-full max-w-sm ${tool.bg} border border-white/10 rounded-2xl p-5 flex items-center gap-5 active:scale-95 transition-transform`}
          >
            <div className={`w-16 h-16 bg-gradient-to-br ${tool.color} rounded-2xl flex items-center justify-center text-white flex-shrink-0`}>
              {tool.icon}
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg">{tool.label}</p>
              <p className="text-gray-400 text-sm">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
