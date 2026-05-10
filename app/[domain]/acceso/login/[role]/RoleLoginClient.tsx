'use client';

import { useEffect, useRef, useState } from 'react';
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

function RoleAccessLoader({
  appName,
  tool,
  logoUrl,
  primary,
  message,
}: {
  appName: string;
  tool: string;
  logoUrl: string | null;
  primary: string;
  message: string;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-5 backdrop-blur-lg">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/[0.92] p-7 text-center text-[#17120d] shadow-[0_30px_100px_rgba(0,0,0,0.34)]">
        <div className="relative mx-auto mb-5 grid h-20 w-20 place-items-center">
          <div className="absolute inset-0 animate-[storeLoaderGlow_1.6s_ease-in-out_infinite] rounded-[1.75rem]" style={{ backgroundColor: primary }} />
          <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-[1.75rem] bg-[#111111] shadow-2xl">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-full w-full object-contain bg-white p-2" />
            ) : (
              <span className="text-3xl font-black text-white">E</span>
            )}
          </div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: primary }}>
          {tool}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{message}</h2>
        <p className="mt-2 text-sm font-semibold text-black/48">Preparando tu sesion operativa.</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-black/10">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full" style={{ backgroundColor: primary }} />
        </div>
      </div>
    </div>
  );
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
  const [loadingMessage, setLoadingMessage] = useState('Verificando acceso');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'select' | 'pin'>('select');
  const pinInputRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    if (phase === 'pin') {
      window.setTimeout(() => pinInputRef.current?.focus(), 80);
    }
  }, [phase]);

  async function validatePin(value: string) {
    if (value.length < 4) return;
    setLoading(true);
    setLoadingMessage('Verificando acceso');
    setError('');
    let keepLoader = false;

    try {
      const res = await fetch('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantSlug, pin: value, role: config.apiRole }),
      });

      if (res.ok) {
        const data = await res.json();
        const authenticatedStaffId = data.staff_id || staffId;
        const authenticatedStaffName = data.staff_name || staffName;

        setLoadingMessage('Registrando sesion');
        await fetch('/api/staff/session/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, employee_name: authenticatedStaffName, role, pin: value }),
        });

        sessionStorage.setItem('staff_role', role);
        sessionStorage.setItem('staff_tenant', tenantId);
        sessionStorage.setItem('staff_name', authenticatedStaffName);
        sessionStorage.setItem('staff_id', authenticatedStaffId);

        await fetch('/api/staff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, role, staffId: authenticatedStaffId, staffName: authenticatedStaffName }),
        });

        setLoadingMessage(`Abriendo ${config.tool}`);
        const roleDestinations: Record<string, string> = {
          admin: `/${tenantSlug}/admin/dashboard`,
          cocinero: `/${tenantSlug}/staff/kds`,
          camarero: `/${tenantSlug}/kitchen`,
          cajero: `/${tenantSlug}/staff/pos`,
        };
        keepLoader = true;
        router.push(roleDestinations[role] || `/${tenantSlug}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) {
        setError('Esta funcion requiere plan Pro o Premium.');
        setPin('');
        return;
      }
      setError('PIN incorrecto.');
      setPin('');
    } catch {
      setError('Error de conexion.');
      setPin('');
    } finally {
      if (!keepLoader) {
        setLoading(false);
        setLoadingMessage('Verificando acceso');
      }
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

  function handlePinInput(value: string) {
    if (loading) return;
    const next = value.replace(/\D/g, '').slice(0, 6);
    setError('');
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
      {loading && (
        <RoleAccessLoader
          appName={appName}
          tool={config.tool}
          logoUrl={logoUrl}
          primary={primary}
          message={loadingMessage}
        />
      )}

      <button
        onClick={goBack}
        className="fixed left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.07] text-white/70 transition hover:bg-white/[0.12] hover:text-white sm:left-6 sm:top-6 sm:h-12 sm:w-12"
        title="Volver"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between border-white/10 px-4 pb-3 pt-14 sm:px-10 sm:py-9 sm:pl-24 lg:border-r">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-2xl sm:h-16 sm:w-16">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-full w-full object-contain bg-white p-1.5 sm:p-2" />
              ) : (
                <ChefHat className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: primary }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Acceso personal</p>
              <h1 className="text-lg font-black tracking-tight sm:text-2xl">{appName}</h1>
            </div>
          </div>

          <div className="hidden lg:block">
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

        <section className="flex min-h-0 items-start justify-center px-3 pb-3 pt-1 sm:p-10 sm:pt-6 lg:items-center">
          <div className="w-full max-w-md rounded-[1.5rem] border border-white/12 bg-white/[0.075] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:rounded-[2rem] sm:p-7">
            <div className="mb-4 flex items-center gap-3 sm:mb-7 sm:gap-4">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl border sm:h-16 sm:w-16"
                style={{
                  backgroundColor: `${primary}24`,
                  borderColor: `${primary}55`,
                  color: primaryText,
                }}
              >
                <RoleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] sm:text-sm" style={{ color: primary }}>
                  {config.label}
                </p>
                <p className="text-base font-black text-white sm:text-lg">{phase === 'select' ? 'Selecciona tu nombre' : staffName}</p>
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
                <div className="mb-4 flex justify-center gap-2 sm:mb-7 sm:gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="grid h-8 w-8 place-items-center rounded-full border-2 transition-colors sm:h-11 sm:w-11"
                      style={{
                        backgroundColor: index < pin.length ? primary : 'rgba(255,255,255,0.08)',
                        borderColor: index < pin.length ? primary : 'rgba(255,255,255,0.14)',
                      }}
                    >
                      {index < pin.length && <div className="h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3" style={{ backgroundColor: primaryText }} />}
                    </div>
                  ))}
                </div>

                <label className="mb-4 block">
                  <span className="mb-2 block text-center text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Escribe tu PIN
                  </span>
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    value={pin}
                    onChange={(event) => handlePinInput(event.target.value)}
                    disabled={loading}
                    className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-center text-2xl font-black tracking-[0.55em] text-white outline-none transition placeholder:tracking-normal placeholder:text-white/25 focus:border-white/35 disabled:opacity-50"
                    placeholder="PIN"
                  />
                </label>

                {error && (
                  <p className="mb-4 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-100">
                    {error}
                  </p>
                )}
                {loading && <p className="mb-4 text-center text-sm font-bold text-white/58">{loadingMessage}...</p>}

                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
                    if (key === '') return <div key="empty" />;
                    const isDelete = key === 'del';
                    return (
                      <button
                        key={key}
                        onClick={() => pressKey(key)}
                        disabled={loading}
                        className="grid h-[52px] place-items-center rounded-2xl border text-xl font-black transition active:scale-95 disabled:opacity-50 sm:h-16 sm:text-2xl"
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

                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 sm:mt-7 sm:text-xs">
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
