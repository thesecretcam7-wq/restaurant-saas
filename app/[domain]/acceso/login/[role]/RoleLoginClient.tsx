'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowLeft, Delete } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  role: 'cocinero' | 'camarero' | 'cajero' | 'admin';
}

const ROLE_CONFIG = {
  cocinero: {
    label: 'Cocinero',
    apiRole: 'kitchen',
  },
  camarero: {
    label: 'Camarero',
    apiRole: 'waiter',
  },
  cajero: {
    label: 'Cajero',
    apiRole: 'waiter',
  },
  admin: {
    label: 'Administrador',
    apiRole: 'admin',
  },
};

export function RoleLoginClient({ tenantId, tenantName, tenantSlug, logoUrl, role }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'name' | 'pin'>('name');
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];

  async function handleNameSubmit() {
    if (!name.trim()) {
      setError('Ingresa tu nombre');
      return;
    }
    setError('');
    setPhase('pin');
  }

  async function validatePin(p: string) {
    if (p.length < 4) return;

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
        // Registrar sesión
        await fetch('/api/staff/session/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            employee_name: name,
            role,
            pin: p,
          }),
        });

        // Store session
        sessionStorage.setItem('staff_role', role);
        sessionStorage.setItem('staff_tenant', tenantId);
        sessionStorage.setItem('staff_name', name);

        // Set httpOnly cookie
        await fetch('/api/staff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId }),
        });

        // Redirect to portal
        router.push(`/${tenantId}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) {
        setError('Esta función requiere plan Pro o Premium.');
        return;
      }
      setError('PIN incorrecto.');
    } catch {
      setError('Error de conexión.');
    } finally {
      setLoading(false);
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
    if (next.length === 6) validatePin(next);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <button
        onClick={() => {
          if (phase === 'pin') {
            setPhase('name');
            setPin('');
            setError('');
          } else {
            router.back();
          }
        }}
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
        <p className="text-white font-bold text-xl">{config.label}</p>
        <p className="text-gray-400 text-sm mt-1">{tenantName}</p>
      </div>

      {phase === 'name' ? (
        <div className="w-full max-w-sm space-y-4">
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleNameSubmit()}
            autoFocus
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-center text-lg"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleNameSubmit}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
          >
            Continuar
          </button>
        </div>
      ) : (
        <>
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

          <p className="text-gray-600 text-xs mt-8 text-center">Ingresa tu PIN de 6 dígitos</p>
        </>
      )}
    </div>
  );
}
