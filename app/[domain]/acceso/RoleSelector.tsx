'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, CreditCard, Lock, LogIn, ShieldCheck, UtensilsCrossed } from 'lucide-react';

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
  branding: Branding;
}

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

export function RoleSelector({ tenantName, tenantSlug, logoUrl, branding }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;
  const accent = branding.accentColor;
  const pageBg = isDark(branding.backgroundColor) ? branding.backgroundColor : '#0b0f19';
  const primaryText = readableText(primary);
  const secondaryText = readableText(secondary);
  const appName = branding.appName || tenantName;

  const roles = [
    {
      id: 'cocinero' as const,
      label: 'Cocinero',
      icon: ChefHat,
      desc: 'Kitchen Display',
      hint: 'Pedidos en cocina',
      color: primary,
    },
    {
      id: 'camarero' as const,
      label: 'Camarero',
      icon: UtensilsCrossed,
      desc: 'Comandero',
      hint: 'Mesas y servicio',
      color: accent,
    },
    {
      id: 'cajero' as const,
      label: 'Cajero',
      icon: CreditCard,
      desc: 'TPV',
      hint: 'Pagos y caja',
      color: '#22c55e',
    },
    {
      id: 'admin' as const,
      label: 'Administrador',
      icon: Lock,
      desc: 'Panel de control',
      hint: 'Gestion completa',
      color: secondary,
    },
  ];

  function handleSelect(roleId: string) {
    setSelectedRole(roleId);
    router.push(`/${tenantSlug}/acceso/login/${roleId}`);
  }

  return (
    <main
      className="min-h-screen overflow-hidden text-white"
      style={{
        background:
          `radial-gradient(circle at 16% 12%, ${primary}33, transparent 34%), ` +
          `radial-gradient(circle at 88% 18%, ${accent}24, transparent 30%), ` +
          `linear-gradient(135deg, ${pageBg}, #020617 78%)`,
      }}
    >
      <div className="flex min-h-screen">
        <section className="flex w-[42%] min-w-[380px] flex-col justify-between border-r border-white/10 px-10 py-9">
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
              Equipo operativo
            </p>
            <h2 className="max-w-lg text-6xl font-black leading-[0.94] tracking-tight">
              Elige tu puesto para entrar
            </h2>
            <p className="mt-6 max-w-md text-lg font-semibold leading-relaxed text-white/58">
              Cada perfil abre solo las herramientas que necesita durante el servicio.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <ShieldCheck className="h-5 w-5" style={{ color: primary }} />
            <p className="text-sm font-semibold text-white/62">Entrada segura con PIN del empleado</p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center p-10">
          <div className="grid w-full max-w-4xl grid-cols-2 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              const selected = selectedRole === role.id;
              const disabled = selectedRole !== null;

              return (
                <button
                  key={role.id}
                  onClick={() => handleSelect(role.id)}
                  disabled={disabled}
                  className={`group min-h-[220px] rounded-3xl border p-6 text-left transition-all duration-200 active:scale-[0.98] ${
                    disabled ? 'cursor-not-allowed opacity-55' : 'hover:-translate-y-1 hover:bg-white/[0.11]'
                  }`}
                  style={{
                    backgroundColor: selected ? `${role.color}20` : 'rgba(255,255,255,0.075)',
                    borderColor: selected ? role.color : 'rgba(255,255,255,0.12)',
                    boxShadow: selected ? `0 24px 70px ${role.color}30` : '0 20px 60px rgba(0,0,0,0.22)',
                  }}
                >
                  <div className="flex h-full flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className="grid h-16 w-16 place-items-center rounded-2xl border"
                        style={{
                          backgroundColor: `${role.color}24`,
                          borderColor: `${role.color}55`,
                          color: role.id === 'admin' ? secondaryText : role.id === 'cocinero' ? primaryText : '#ffffff',
                        }}
                      >
                        <Icon className="h-8 w-8" />
                      </div>
                      <LogIn className="h-5 w-5 text-white/30 transition group-hover:text-white/70" />
                    </div>

                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em]" style={{ color: role.color }}>
                        {role.desc}
                      </p>
                      <h3 className="mt-2 text-3xl font-black text-white">{role.label}</h3>
                      <p className="mt-2 text-sm font-semibold text-white/52">{role.hint}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
