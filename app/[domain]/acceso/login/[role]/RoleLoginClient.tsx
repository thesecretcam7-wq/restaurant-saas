'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChefHat, CreditCard, Delete, Lock, ShieldCheck, UtensilsCrossed } from 'lucide-react';

interface StaffMember {
  id: string;
  name: string;
  role: string;
}

interface Branding {
  appName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textPrimaryColor: string;
  textSecondaryColor: string;
}

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  role: 'cocinero' | 'camarero' | 'cajero' | 'admin';
  staffMembers: StaffMember[];
  branding: Branding;
}

const ROLE_CONFIG = {
  cocinero: { label: 'Cocinero', apiRole: 'cocinero', tool: 'Kitchen Display', icon: ChefHat },
  camarero: { label: 'Camarero', apiRole: 'camarero', tool: 'Comandero', icon: UtensilsCrossed },
  cajero: { label: 'Cajero', apiRole: 'cajero', tool: 'TPV', icon: CreditCard },
  admin: { label: 'Administrador', apiRole: 'admin', tool: 'Panel de control', icon: Lock },
};

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function isDark(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance < 0.5;
}

function readableText(background: string, fallbackDark = '#15130f', fallbackLight = '#ffffff') {
  return isDark(background) ? fallbackLight : fallbackDark;
}

export function RoleLoginClient({
  tenantId,
  tenantName,
  tenantSlug,
  logoUrl,
  role,
  staffMembers,
  branding,
}: Props) {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'select' | 'pin'>('select');
  const config = ROLE_CONFIG[role];
  const RoleIcon = config.icon;

  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;
  const accent = branding.accentColor;
  const pageBg = isDark(branding.backgroundColor) ? branding.backgroundColor : '#0b0f19';
  const primaryText = readableText(primary);
  const secondaryText = readableText(secondary);
  const appName = branding.appName || tenantName;

  async function handleStaffSelect(selectedId: string) {
    const selected = staffMembers.find((staff) => staff.id === selectedId);
    if (!selected) {
      setError('Selecciona un empleado valido');
      return;
    }
    setStaffId(selectedId);
    setStaffName(selected.name);
    setError('');
    setPhase('pin');
  }

  async function validatePin(value: string) {
    if (value.length < 4) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantSlug, pin: value, role: config.apiRole }),
      });

      if (res.ok) {
        await fetch('/api/staff/session/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, employee_name: staffName, role, pin: value }),
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
          admin: `/${tenantSlug}/admin/dashboard`,
          cocinero: `/${tenantSlug}/staff/kds`,
          camarero: `/${tenantSlug}/kitchen`,
          cajero: `/${tenantSlug}/staff/pos`,
        };
        router.push(roleDestinations[role] || `/${tenantSlug}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) {
        setError('Esta funcion requiere plan Pro o Premium.');
        return;
      }
      setError('PIN incorrecto.');
    } catch {
      setError('Error de conexion.');
    } finally {
      setLoading(false);
    }
  }

  function pressKey(key: string) {
    if (loading) return;
    setError('');
    if (key === 'del') {
      setPin((current) => current.slice(0, -1));
      return;
    }
    if (pin.length >= 6) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 6) validatePin(next);
  }

  function goBack() {
    if (phase === 'pin') {
      setPhase('select');
      setPin('');
      setError('');
      setStaffId('');
      setStaffName('');
      return;
    }
    router.push(`/${tenantSlug}/acceso`);
  }

  return (
    <main
      className="min-h-screen overflow-hidden text-white"
      style={{
        background:
          `radial-gradient(circle at 18% 18%, ${primary}33, transparent 34%), ` +
          `radial-gradient(circle at 86% 12%, ${accent}24, transparent 30%), ` +
          `linear-gradient(135deg, ${pageBg}, #020617 78%)`,
      }}
    >
      <button
        onClick={goBack}
        className="fixed left-6 top-6 z-20 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-white/70 transition hover:bg-white/[0.12] hover:text-white"
        title="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="grid min-h-screen grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between border-r border-white/10 px-10 py-9 pl-24">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-full w-full object-contain bg-white p-2" />
              ) : (
                <ChefHat className="h-8 w-8" style={{ color: primary }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Acceso personal</p>
              <h1 className="text-2xl font-black tracking-tight">{appName}</h1>
            </div>
          </div>

          <div>
            <p
              className="mb-5 inline-flex rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em]"
              style={{ backgroundColor: `${primary}24`, color: primary }}
            >
              {config.tool}
            </p>
            <h2 className="max-w-lg text-6xl font-black leading-[0.94] tracking-tight">
              Acceso de {config.label}
            </h2>
            <p className="mt-6 max-w-md text-lg font-semibold leading-relaxed text-white/58">
              Selecciona tu usuario y confirma tu PIN para continuar al entorno operativo.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <ShieldCheck className="h-5 w-5" style={{ color: primary }} />
            <p className="text-sm font-semibold text-white/62">Sesion protegida por perfil y PIN</p>
          </div>
        </section>

        <section className="flex items-center justify-center p-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/12 bg-white/[0.075] p-7 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-7 flex items-center gap-4">
              <div
                className="grid h-16 w-16 place-items-center rounded-2xl border"
                style={{
                  backgroundColor: `${primary}24`,
                  borderColor: `${primary}55`,
                  color: primaryText,
                }}
              >
                <RoleIcon className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: primary }}>
                  {config.label}
                </p>
                <p className="text-lg font-black text-white">{phase === 'select' ? 'Selecciona tu nombre' : staffName}</p>
              </div>
            </div>

            {phase === 'select' ? (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-white/62">Empleado</label>
                <select
                  value={staffId}
                  onChange={(event) => handleStaffSelect(event.target.value)}
                  autoFocus
                  className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-4 text-lg font-bold text-white outline-none transition focus:border-white/35"
                >
                  <option value="">Elige tu nombre</option>
                  {staffMembers.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>

                {staffMembers.length === 0 && (
                  <p className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100">
                    No hay empleados registrados para este rol.
                  </p>
                )}
                {error && (
                  <p className="rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100">
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="mb-7 flex justify-center gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid h-11 w-11 place-items-center rounded-full border-2 transition-colors"
                      style={{
                        backgroundColor: index < pin.length ? primary : 'rgba(255,255,255,0.08)',
                        borderColor: index < pin.length ? primary : 'rgba(255,255,255,0.14)',
                      }}
                    >
                      {index < pin.length && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryText }} />}
                    </div>
                  ))}
                </div>

                {error && (
                  <p className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100">
                    {error}
                  </p>
                )}
                {loading && <p className="mb-4 text-center text-sm font-bold text-white/58">Verificando...</p>}

                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                    if (key === '') return <div key="empty" />;
                    const isDelete = key === 'del';
                    return (
                      <button
                        key={key}
                        onClick={() => pressKey(key)}
                        disabled={loading}
                        className="grid h-16 place-items-center rounded-2xl border text-2xl font-black transition active:scale-95 disabled:opacity-50"
                        style={{
                          backgroundColor: isDelete ? `${secondary}66` : 'rgba(255,255,255,0.09)',
                          borderColor: isDelete ? `${secondary}aa` : 'rgba(255,255,255,0.12)',
                          color: isDelete ? secondaryText : '#ffffff',
                        }}
                      >
                        {key === 'del' ? <Delete className="h-5 w-5" /> : key}
                      </button>
                    );
                  })}
                </div>

                <p className="mt-7 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                  PIN de 6 digitos
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
