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

// Note: PIN colors are now CSS variable-based, applied via inline styles
const PIN_COLORS = {
  cocinero: true,
  camarero: true,
  cajero: true,
  admin: true,
} as const;

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
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: `linear-gradient(to bottom right, var(--color-surface-primary), color-mix(in srgb, var(--color-primary) 5%, white), color-mix(in srgb, var(--color-success) 5%, white))`
      }}
    >
      <button
        onClick={() => {
          if (phase === 'pin') {
            setPhase('select'); setPin(''); setError(''); setStaffId(''); setStaffName('');
          } else {
            router.back();
          }
        }}
        className="fixed top-4 left-4 p-2 transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-secondary)')}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="mb-8 text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
        ) : (
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-secondary))' }}>
            <ChefHat className="w-8 h-8 text-white" />
          </div>
        )}
        <p className="font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>{config.label}</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>{tenantName}</p>
      </div>

      {phase === 'select' ? (
        <div className="w-full max-w-sm space-y-4">
          <p className="text-center text-sm mb-4" style={{ color: 'var(--color-text-primary)' }}>Selecciona tu nombre</p>
          <select
            value={staffId}
            onChange={e => handleStaffSelect(e.target.value)}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-center text-lg shadow-sm focus:outline-none"
            style={{ backgroundColor: 'var(--color-surface-primary)', borderColor: 'var(--color-border-light)', borderWidth: '1px', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-primary)' } as React.CSSProperties}
          >
            <option value="">-- Elige tu nombre --</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
          </select>
          {error && <p className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {staffMembers.length === 0 && (
            <p className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>No hay empleados registrados</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  background: i < pin.length ? `linear-gradient(to bottom right, var(--color-primary), var(--color-secondary))` : 'var(--color-surface-primary)',
                  borderColor: i < pin.length ? 'var(--color-secondary)' : 'var(--color-border-light)',
                }}
              >
                {i < pin.length && <div className="w-3 h-3 bg-white rounded-full" />}
              </div>
            ))}
          </div>

          {error && <p className="text-sm mb-4 text-center" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {loading && <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>Verificando...</p>}

          <div className="grid grid-cols-3 gap-3 w-64">
            {['1','2','3','4','5','6','7','8','9','','0','del'].map((key) => {
              if (key === '') return <div key="empty" />;
              const isDelBtn = key === 'del';
              return (
                <button
                  key={key}
                  onClick={() => pressKey(key)}
                  disabled={loading}
                  className="h-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: isDelBtn ? 'color-mix(in srgb, var(--color-border-light) 50%, white)' : 'var(--color-surface-primary)',
                    color: isDelBtn ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                    borderColor: 'var(--color-border-light)',
                    borderWidth: '1px',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = isDelBtn ? 'color-mix(in srgb, var(--color-border-light) 70%, white)' : 'color-mix(in srgb, var(--color-border-light) 20%, white)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.backgroundColor = isDelBtn ? 'color-mix(in srgb, var(--color-border-light) 50%, white)' : 'var(--color-surface-primary)';
                  }}
                >
                  {key === 'del' ? <Delete className="w-5 h-5" /> : key}
                </button>
              );
            })}
          </div>

          <p className="text-xs mt-8 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Ingresa tu PIN de 6 dígitos</p>
        </>
      )}
    </div>
  );
}
