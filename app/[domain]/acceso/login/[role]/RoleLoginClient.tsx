'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  initialStaffId?: string | null;
  initialStaffName?: string | null;
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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
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
    <div
      className="ecco-fixed-layer fixed inset-0 z-50 grid h-[100dvh] w-screen place-items-center bg-[#0B0E14]/82 px-5 backdrop-blur-xl"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100dvh' }}
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/92 p-7 text-center text-white shadow-[0_30px_110px_rgba(0,0,0,0.36)]">
        <div className="relative mx-auto mb-5 grid h-28 w-36 place-items-center">
          <div className="relative grid h-28 w-36 place-items-center">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="h-full w-full object-contain drop-shadow-2xl" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-[1.75rem] bg-[#0B0E14] text-3xl font-black text-[#D4AF37] shadow-2xl">E</span>
            )}
          </div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D4AF37]">
          {tool}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">{message}</h2>
        <p className="mt-2 text-sm font-semibold text-[#8b97a8]">Preparando tu sesion operativa.</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full bg-[#D35A37]" />
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
  initialStaffId,
  initialStaffName,
  branding,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [staffId, setStaffId] = useState(initialStaffId || '');
  const [staffName, setStaffName] = useState(initialStaffName || '');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Verificando acceso');
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<'select' | 'pin'>(initialStaffId ? 'pin' : 'select');
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const pinFormRef = useRef<HTMLFormElement | null>(null);
  const config = ROLE_CONFIG[role];
  const RoleIcon = config.icon;

  const premiumGold = '#D35A37';
  const premiumGoldSoft = '#D4AF37';
  const premiumEmber = '#D4AF37';
  const pageBg = '#0B0E14';
  const highlight = premiumGold;
  const secondaryHighlight = premiumEmber;
  const primaryText = readableText(highlight);
  const secondaryText = readableText(secondaryHighlight);
  const appName = branding.appName || tenantName;
  const accessPath = `/${tenantSlug}/acceso`;
  const queryError = searchParams.get('error');
  const formError =
    error ||
    (queryError === 'pin'
      ? 'PIN incorrecto. Intenta de nuevo.'
      : queryError === 'missing'
        ? 'Faltan datos para iniciar sesion. Vuelve a seleccionar tu nombre.'
        : queryError === 'session'
          ? 'No se pudo abrir la sesion. Intenta de nuevo.'
          : '');

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
    if (phase === 'pin' && !loading) {
      const focusTimer = window.setTimeout(() => pinInputRef.current?.focus(), 80);
      return () => window.clearTimeout(focusTimer);
    }
  }, [phase, loading, error]);

  function resetPinWithError(message: string) {
    setError(message);
    setPin('');
    window.setTimeout(() => pinInputRef.current?.focus(), 80);
  }

  async function validatePin(value: string) {
    if (value.length < 4 || loading) return;
    setLoading(true);
    setLoadingMessage('Verificando acceso');
    setError('');
    let keepLoader = false;

    try {
      const res = await fetchWithTimeout('/api/staff/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: tenantSlug, pin: value, role: config.apiRole }),
      });

      if (res.ok) {
        const data = await res.json();
        const authenticatedStaffId = data.staff_id || staffId;
        const authenticatedStaffName = data.staff_name || staffName;

        setLoadingMessage('Registrando sesion');
        fetch('/api/staff/session/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, employee_name: authenticatedStaffName, role }),
        }).catch(() => {});

        sessionStorage.setItem('staff_role', role);
        sessionStorage.setItem('staff_tenant', tenantId);
        sessionStorage.setItem('staff_name', authenticatedStaffName);
        sessionStorage.setItem('staff_id', authenticatedStaffId);

        const sessionRes = await fetchWithTimeout('/api/staff/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, role, staffId: authenticatedStaffId, staffName: authenticatedStaffName }),
        });

        if (!sessionRes.ok) {
          const sessionError = await sessionRes.json().catch(() => null);
          throw new Error(sessionError?.error || 'No se pudo registrar la sesion.');
        }

        setLoadingMessage(`Abriendo ${config.tool}`);
        const roleDestinations: Record<string, string> = {
          admin: `/${tenantSlug}/admin/dashboard`,
          cocinero: `/${tenantSlug}/staff/kds`,
          camarero: `/${tenantSlug}/kitchen`,
          cajero: `/${tenantSlug}/staff/pos`,
        };
        keepLoader = true;
        router.replace(roleDestinations[role] || `/${tenantSlug}/acceso/portal/${role}`);
        return;
      }

      const data = await res.json();
      if (data.requiresUpgrade) {
        resetPinWithError('Esta funcion requiere plan Pro o Premium.');
        return;
      }
      resetPinWithError('PIN incorrecto. Intenta de nuevo.');
    } catch (err) {
      const wasAborted = err instanceof Error && err.name === 'AbortError';
      resetPinWithError(wasAborted ? 'La verificacion tardo mucho. Intenta de nuevo.' : (err instanceof Error ? err.message : 'Error de conexion. Intenta de nuevo.'));
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

  function submitPin() {
    if (loading) return;
    if (pin.length < 4) {
      resetPinWithError('El PIN debe tener minimo 4 digitos.');
      return;
    }
    validatePin(pin);
  }

  function handlePinInput(value: string) {
    if (loading) return;
    const next = value.replace(/\D/g, '').slice(0, 6);
    setError('');
    setPin(next);
    if (next.length === 6) {
      window.setTimeout(() => pinFormRef.current?.requestSubmit(), 80);
    }
  }

  function goBack() {
    if (loading) return;
    if (phase === 'pin') {
      window.location.href = `/${tenantSlug}/acceso/login/${role}`;
      return;
    }
    router.push(accessPath);
    window.setTimeout(() => {
      if (window.location.pathname !== accessPath) {
        window.location.href = accessPath;
      }
    }, 250);
  }

  useEffect(() => {
    if (phase !== 'pin') return;

    function handleKeyboard(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || loading) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        pressKey(event.key);
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        pressKey('del');
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        submitPin();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        goBack();
      }
    }

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [phase, loading, pin, staffId, staffName]);

  return (
    <main
      className="min-h-screen overflow-hidden text-white"
      style={{
        background:
          `radial-gradient(circle at 18% 18%, ${premiumEmber}18 0%, transparent 34%), ` +
          `radial-gradient(circle at 82% 18%, ${highlight}10 0%, transparent 34%), ` +
          `linear-gradient(135deg, ${pageBg}, #101622 48%, #0B0E14 100%)`,
        }}
    >
      {loading && (
        <RoleAccessLoader
          appName={appName}
          tool={config.tool}
          logoUrl={logoUrl}
          primary={highlight}
          message={loadingMessage}
        />
      )}

      {phase === 'select' ? (
        <a
          href={accessPath}
          className="pointer-events-auto fixed left-3 top-3 z-[10010] grid h-10 w-10 place-items-center rounded-2xl border border-[#D4AF37]/28 bg-[#1A1F2C]/78 text-[#D4AF37] shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition hover:border-[#D4AF37]/55 hover:bg-[#20283a] sm:left-6 sm:top-6 sm:h-12 sm:w-12"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </a>
      ) : (
        <button
          type="button"
          onClick={goBack}
          className="pointer-events-auto fixed left-3 top-3 z-[10010] grid h-10 w-10 place-items-center rounded-2xl border border-[#D4AF37]/28 bg-[#1A1F2C]/78 text-[#D4AF37] shadow-[0_18px_50px_rgba(0,0,0,0.24)] transition hover:border-[#D4AF37]/55 hover:bg-[#20283a] sm:left-6 sm:top-6 sm:h-12 sm:w-12"
          title="Volver"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}

      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="flex flex-col justify-between border-[#D4AF37]/16 bg-[#0B0E14]/78 px-4 pb-3 pt-14 shadow-[inset_-1px_0_0_rgba(212,175,55,0.12)] backdrop-blur-2xl sm:px-10 sm:py-9 sm:pl-24 lg:border-r">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="grid h-20 w-28 place-items-center sm:h-24 sm:w-32">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-full w-full object-contain drop-shadow-2xl" />
              ) : (
                <ChefHat className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: highlight }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D4AF37]">Acceso personal</p>
              <h1 className="text-lg font-black tracking-tight text-white sm:text-2xl">{appName}</h1>
            </div>
          </div>

          <div className="hidden lg:block">
            <p className="mb-5 inline-flex rounded-full border border-[#D4AF37]/24 bg-[#1A1F2C]/70 px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-[#D4AF37]">
              {config.tool}
            </p>
            <h2 className="max-w-lg text-6xl font-black leading-[0.94] tracking-tight text-white">
              Acceso de {config.label}
            </h2>
            <p className="mt-6 max-w-md text-lg font-semibold leading-relaxed text-[#8b97a8]">
              Selecciona tu usuario y confirma tu PIN para continuar al entorno operativo.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-[#1A1F2C]/70 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
            <ShieldCheck className="h-5 w-5" style={{ color: highlight }} />
            <p className="text-sm font-semibold text-[#8b97a8]">Sesion protegida por perfil y PIN</p>
          </div>
        </section>

        <section className="flex min-h-0 items-start justify-center bg-[radial-gradient(circle_at_50%_20%,rgba(212,175,55,0.10),transparent_38%)] px-3 pb-3 pt-1 sm:p-10 sm:pt-6 lg:items-center">
          <div className="w-full max-w-md rounded-[1.5rem] border border-[#D4AF37]/20 bg-[#1A1F2C]/82 p-4 shadow-[0_30px_110px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:rounded-[2rem] sm:p-7">
            <div className="mb-4 flex items-center gap-3 sm:mb-7 sm:gap-4">
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl border sm:h-16 sm:w-16"
                style={{
                  backgroundColor: `${highlight}24`,
                  borderColor: `${highlight}55`,
                  color: primaryText,
                }}
              >
                <RoleIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37] sm:text-sm">
                  {config.label}
                </p>
                <p className="text-base font-black text-white sm:text-lg">{phase === 'select' ? 'Selecciona tu nombre' : staffName}</p>
              </div>
            </div>

            {phase === 'select' ? (
              <div className="space-y-4">
                <p className="block text-sm font-bold text-[#8b97a8]">Empleado</p>
                <div className="grid gap-2">
                  {staffMembers.map((staff) => (
                    <a
                      key={staff.id}
                      href={`/${tenantSlug}/acceso/login/${role}?staffId=${encodeURIComponent(staff.id)}`}
                      className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14]/70 px-4 py-3 text-left text-base font-black text-white transition active:scale-[0.98] hover:border-[#D4AF37]/45 hover:bg-[#121826]"
                    >
                      <span className="min-w-0 truncate">{staff.name}</span>
                      <span className="rounded-full border border-[#D4AF37]/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#D4AF37]">
                        PIN
                      </span>
                    </a>
                  ))}
                </div>

                {staffMembers.length === 0 && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                    No hay empleados registrados para este rol.
                  </p>
                )}
                {error && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <>
                <form
                  ref={pinFormRef}
                  method="POST"
                  action="/api/staff/login-form"
                  className="space-y-4"
                >
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="tenantSlug" value={tenantSlug} />
                  <input type="hidden" name="role" value={role} />
                  <input type="hidden" name="staffId" value={staffId} />
                  <input type="hidden" name="staffName" value={staffName} />

                  <label className="block">
                    <span className="mb-3 block text-center text-xs font-black uppercase tracking-[0.16em] text-[#8b97a8]">
                      Toca el campo y escribe tu PIN
                    </span>
                    <input
                      ref={pinInputRef}
                      name="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="one-time-code"
                      minLength={4}
                      maxLength={6}
                      required
                      autoFocus
                      value={pin}
                      onChange={(event) => handlePinInput(event.target.value)}
                      onInput={(event) => handlePinInput(event.currentTarget.value)}
                      className="h-16 w-full rounded-2xl border border-[#D4AF37]/20 bg-[#0B0E14]/70 px-4 text-center text-2xl font-black tracking-[0.45em] text-white outline-none transition placeholder:tracking-normal placeholder:text-[#8b97a8] focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/10 disabled:opacity-50"
                      placeholder="PIN"
                    />
                  </label>

                  {formError && (
                    <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-bold text-red-700">
                      {formError}
                    </p>
                  )}
                  {loading && <p className="text-center text-sm font-bold text-[#8b97a8]">{loadingMessage}...</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full rounded-2xl bg-[#D35A37] text-base font-black text-white shadow-[0_16px_34px_rgba(211,90,55,0.24)] transition hover:bg-[#bd4d31] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#334155] disabled:text-[#8b97a8] disabled:shadow-none"
                  >
                    Entrar
                  </button>
                </form>

                <a
                  href={`/${tenantSlug}/acceso/login/${role}`}
                  className="mt-3 block text-center text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37] sm:mt-5"
                >
                  Cambiar empleado
                </a>

                <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#8b97a8] sm:mt-5 sm:text-xs">
                  PIN de 4 a 6 digitos
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
