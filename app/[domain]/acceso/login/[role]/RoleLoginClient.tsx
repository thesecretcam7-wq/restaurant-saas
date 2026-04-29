'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowLeft, Delete } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  role: 'cocinero' | 'camarero' | 'cajero' | 'admin';
  staffMembers: StaffMember[];
}

const ROLE_CONFIG = {
  cocinero: { label: 'Cocinero', apiRole: 'cocinero' },
  camarero: { label: 'Camarero', apiRole: 'camarero' },
  cajero:   { label: 'Cajero',   apiRole: 'cajero' },
  admin:    { label: 'Administrador', apiRole: 'admin' },
};

export function RoleLoginClient({ tenantId, tenantName, tenantSlug, logoUrl, role, staffMembers }: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'select' | 'pin'>('select');
  const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];

  async function handleStaffSelect(selectedId: string) {
    const selected = staffMembers.find(s => s.id === selectedId);
    if (!selected) { setError('Selecciona un empleado válido'); return; }
    setStaffId(selectedId);
    setStaffName(selected.name);
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
        body: JSON.stringify({ domain: tenantSlug, pin: p, role: config.apiRole }),
      });

      if (res.ok) {
        await fetch('/api/staff/session/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, employee_name: staffName, role, pin: p }),
        });

        sessionStorage.setItem('staff_role', role);
        sessionStorage.setItem('staff_tenant', tenantId);
        sessionStorage.setItem('staff_name', staffName);
        sessionStorage.setItem('staff_id', staffId);

        await fetch('/api/staff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, role, staffId, staffName }),
        });

        const roleDestinations: Record<string, string> = {
          admin:    `/${tenantSlug}/admin/dashboard`,
          cocinero: `/${tenantSlug}/staff/kds`,
          camarero: `/${tenantSlug}/kitchen`,
          cajero:   `/${tenantSlug}/staff/pos`,
        };
        router.push(roleDestinations[role] || `/${tenantSlug}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) { setError('Esta función requiere plan Pro o Premium.'); return; }
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
    if (key === 'del') { setPin(p => p.slice(0, -1)); return; }
    const next = pin + key;
    setPin(next);
    if (next.length === 6) validatePin(next);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <button
        onClick={() => {
          if (phase === 'pin') {
            setPhase('select'); setPin(''); setError(''); setStaffId(''); setStaffName('');
          } else {
            router.back();
          }
        }}
        className="fixed top-4 left-4 p-2 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-8 text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
        ) : (
          <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
        )}
        <p className="text-gray-900 font-bold text-xl">{config.label}</p>
        <p className="text-gray-500 text-sm mt-1">{tenantName}</p>
      </div>

      {phase === 'select' ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-gray-700 text-center text-sm mb-4">Selecciona tu nombre</p>
          <select
            value={staffId}
            onChange={e => handleStaffSelect(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-blue-500 text-center text-lg shadow-sm"
          >
            <option value="">-- Elige tu nombre --</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          {staffMembers.length === 0 && (
            <p className="text-red-500 text-sm text-center">No hay empleados registrados</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                  i < pin.length ? 'bg-gradient-to-br from-red-500 to-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                }`}
              >
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          {loading && <p className="text-gray-500 text-sm mb-4">Verificando...</p>}

          <div className="grid grid-cols-3 gap-3 w-64">
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((key) => {
              if (key === '') return <div key="empty" />;
              return (
                <button
                  key={key}
                  onClick={() => pressKey(key)}
                  disabled={loading}
                  className={`h-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95 shadow-sm ${
                    key === 'del'
                      ? 'bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200'
                      : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {key === 'del' ? <Delete className="w-5 h-5" /> : key}
                </button>
              );
            })}
          </div>

          <p className="text-gray-400 text-xs mt-8 text-center">Ingresa tu PIN de 6 dígitos</p>
        </>
      )}
    </div>
  );
}
