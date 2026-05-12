'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, CreditCard, Lock, LogIn, Monitor, ShieldCheck, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher';

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

function isVisibleAccent(color: string) {
  const rgb = hexToRgb(color);
  if (!rgb) return false;
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255;
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255;
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return saturation > 0.28 && lightness > 0.2;
}

export function RoleSelector({ tenantName, tenantSlug, logoUrl, branding }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { tr } = useI18n();

  const primary = branding.primaryColor;
  const secondary = branding.secondaryColor;
  const accent = branding.accentColor;
  const pageBg = isDark(primary) ? primary : isDark(branding.backgroundColor) ? branding.backgroundColor : '#0b0f19';
  const highlight = isVisibleAccent(primary) && !isDark(primary) ? primary : accent;
  const secondaryHighlight = isVisibleAccent(secondary) && !isDark(secondary) ? secondary : accent;
  const primaryText = readableText(highlight);
  const secondaryText = readableText(secondaryHighlight);
  const appName = branding.appName || tenantName;

  const roles = [
    {
      id: 'cocinero' as const,
      label: tr('access.cook'),
      icon: ChefHat,
      desc: 'Kitchen Display',
      hint: tr('access.cookDesc'),
      color: highlight,
    },
    {
      id: 'camarero' as const,
      label: tr('access.waiter'),
      icon: UtensilsCrossed,
      desc: 'Comandero',
      hint: tr('access.waiterDesc'),
      color: accent,
    },
    {
      id: 'cajero' as const,
      label: tr('access.cashier'),
      icon: CreditCard,
      desc: 'TPV',
      hint: tr('access.cashierDesc'),
      color: '#22c55e',
    },
    {
      id: 'admin' as const,
      label: tr('access.admin'),
      icon: Lock,
      desc: tr('admin.subtitle'),
      hint: tr('access.adminDesc'),
      color: secondaryHighlight,
    },
  ];

  const deviceLinks = [
    {
      label: tr('access.kiosk'),
      desc: tr('access.kioskDesc'),
      href: `/${tenantSlug}/kiosko`,
      icon: ShoppingBag,
      color: accent,
    },
    {
      label: tr('access.screen'),
      desc: tr('access.screenDesc'),
      href: `/${tenantSlug}/pantalla`,
      icon: Monitor,
      color: highlight,
    },
  ];

  function handleSelect(roleId: string) {
    setSelectedRole(roleId);
    router.push(`/${tenantSlug}/acceso/login/${roleId}`);
  }

  return (
    <main
      className="ecco-premium-app min-h-screen overflow-x-hidden text-white"
      style={{
        background:
          `linear-gradient(120deg, ${highlight}22 0%, transparent 28%), ` +
          `linear-gradient(300deg, ${accent}18 0%, transparent 32%), ` +
          `linear-gradient(135deg, ${pageBg}, #050505 78%)`,
      }}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-col justify-between border-b border-white/10 px-5 py-6 sm:px-8 lg:w-[42%] lg:min-w-[380px] lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-28 place-items-center sm:h-24 sm:w-32">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="h-full w-full object-contain drop-shadow-2xl" />
              ) : (
                <ChefHat className="h-8 w-8" style={{ color: highlight }} />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{tr('admin.nav.staffAccess')}</p>
              <h1 className="text-2xl font-black tracking-tight">{appName}</h1>
            </div>
            <LanguageSwitcher compact className="ml-auto border-white/15 bg-white/10 text-white [&_select]:text-white" />
          </div>

          <div>
            <p
              className="mb-5 inline-flex rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.16em]"
              style={{ backgroundColor: `${highlight}24`, color: highlight }}
            >
              {tr('access.badge')}
            </p>
            <h2 className="max-w-lg text-4xl font-black leading-[0.98] tracking-tight sm:text-5xl lg:text-6xl">
              {tr('access.title')}
            </h2>
            <p className="mt-4 max-w-md text-base font-semibold leading-relaxed text-white/58 sm:text-lg lg:mt-6">
              {tr('access.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
            <ShieldCheck className="h-5 w-5" style={{ color: highlight }} />
            <p className="text-sm font-semibold text-white/62">{tr('access.securePin')}</p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center p-4 sm:p-8 lg:p-10">
          <div className="w-full max-w-4xl space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {deviceLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-4 rounded-3xl border border-white/12 bg-white/[0.09] p-4 text-left shadow-2xl shadow-black/20 transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:bg-white/[0.13]"
                  >
                    <div
                      className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border"
                      style={{ backgroundColor: `${item.color}24`, borderColor: `${item.color}55`, color: '#ffffff' }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-[0.16em]" style={{ color: item.color }}>
                        {tr('access.quick')}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-white">{item.label}</h3>
                      <p className="text-sm font-semibold text-white/52">{item.desc}</p>
                    </div>
                    <LogIn className="h-5 w-5 text-white/30 transition group-hover:text-white/70" />
                  </a>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
              {roles.map((role) => {
                const Icon = role.icon;
                const selected = selectedRole === role.id;
                const disabled = selectedRole !== null;

                return (
                  <button
                    key={role.id}
                    onClick={() => handleSelect(role.id)}
                    disabled={disabled}
                    className={`group min-h-[138px] rounded-3xl border p-4 text-left transition-all duration-200 active:scale-[0.98] sm:min-h-[170px] sm:p-5 lg:min-h-[190px] lg:p-6 ${
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
                          className="grid h-12 w-12 place-items-center rounded-2xl border sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                          style={{
                            backgroundColor: `${role.color}24`,
                            borderColor: `${role.color}55`,
                            color: role.id === 'admin' ? secondaryText : role.id === 'cocinero' ? primaryText : '#ffffff',
                          }}
                        >
                          <Icon className="h-6 w-6 lg:h-8 lg:w-8" />
                        </div>
                        <LogIn className="h-5 w-5 text-white/30 transition group-hover:text-white/70" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] sm:text-sm sm:tracking-[0.16em]" style={{ color: role.color }}>
                          {role.desc}
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-white sm:mt-2 lg:text-3xl">{role.label}</h3>
                        <p className="mt-2 text-sm font-semibold text-white/52">{role.hint}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
