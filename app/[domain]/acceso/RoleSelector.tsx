'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, CreditCard, Lock, LogIn, Monitor, ShieldCheck, ShoppingBag, Tv, UtensilsCrossed } from 'lucide-react';
import LanguageSwitcher, { useI18n } from '@/components/LanguageSwitcher';
import { isStandalonePwa, restoreStaffSession, saveStaffSession } from '@/lib/staff-session-client';

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

function getRoleDestination(tenantSlug: string, role: string) {
  const destinations: Record<string, string> = {
    admin: `/${tenantSlug}/admin/dashboard`,
    cocinero: `/${tenantSlug}/staff/kds`,
    camarero: `/${tenantSlug}/kitchen`,
    cajero: `/${tenantSlug}/staff/pos`,
  };
  return destinations[role] || null;
}

function isOperationalStaffPath(tenantSlug: string, path?: string) {
  if (!path) return false;
  const allowedPaths = [
    `/${tenantSlug}/admin/dashboard`,
    `/${tenantSlug}/staff/kds`,
    `/${tenantSlug}/kitchen`,
    `/${tenantSlug}/staff/pos`,
  ];
  return allowedPaths.some((allowedPath) => path === allowedPath || path.startsWith(`${allowedPath}/`));
}

export function RoleSelector({ tenantId, tenantName, tenantSlug, logoUrl, branding }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const { tr } = useI18n();

  const premiumGold = '#D35A37';
  const premiumGoldSoft = '#D4AF37';
  const premiumEmber = '#D35A37';
  const highlight = premiumGold;
  const secondaryHighlight = premiumGoldSoft;
  const primaryText = readableText(highlight);
  const secondaryText = readableText(secondaryHighlight);
  const appName = branding.appName || tenantName;

  useEffect(() => {
    if (!isStandalonePwa()) return;

    const restored = restoreStaffSession(tenantId);
    if (isOperationalStaffPath(tenantSlug, restored?.lastPath)) {
      router.replace(restored!.lastPath!);
      return;
    }

    fetch('/api/staff/session', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (!session?.authenticated || session.tenantId !== tenantId) return;
        const lastPath = getRoleDestination(tenantSlug, session.role);
        if (!lastPath) return;
        saveStaffSession({
          tenantId,
          tenantSlug,
          staffId: session.staffId,
          staffName: session.staffName || session.role,
          role: session.role,
          lastPath,
        });
        router.replace(lastPath);
      })
      .catch(() => {});
  }, [router, tenantId, tenantSlug]);

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
      color: premiumEmber,
    },
    {
      id: 'cajero' as const,
      label: tr('access.cashier'),
      icon: CreditCard,
      desc: 'TPV',
      hint: tr('access.cashierDesc'),
      color: '#16a34a',
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
      color: premiumEmber,
    },
    {
      label: tr('access.screen'),
      desc: tr('access.screenDesc'),
      href: `/${tenantSlug}/pantalla`,
      icon: Monitor,
      color: highlight,
    },
    {
      label: 'Menu TV',
      desc: 'Carta para el televisor',
      href: `/${tenantSlug}/menu-tv`,
      icon: Tv,
      color: secondaryHighlight,
    },
  ];

  function handleSelect(roleId: string) {
    setSelectedRole(roleId);
    router.push(`/${tenantSlug}/acceso/login/${roleId}`);
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(212,175,55,0.16),transparent_34%),radial-gradient(circle_at_86%_12%,rgba(211,90,55,0.10),transparent_30%),linear-gradient(180deg,#0B0E14_0%,#101622_48%,#0B0E14_100%)] text-white"
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="flex flex-col justify-between border-b border-[#D4AF37]/16 bg-[#0B0E14]/78 px-5 py-6 text-white shadow-[0_34px_110px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:px-8 lg:w-[42%] lg:min-w-[380px] lg:border-b-0 lg:border-r lg:px-10 lg:py-9">
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
            <LanguageSwitcher compact className="ml-auto border-white/10 bg-white/[0.08] text-white [&_select]:text-white" />
          </div>

          <div>
            <p
              className="mb-5 inline-flex rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-white/74"
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

          <div className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-[#1A1F2C]/70 px-4 py-3">
            <ShieldCheck className="h-5 w-5" style={{ color: highlight }} />
            <p className="text-sm font-semibold text-[#8b97a8]">{tr('access.securePin')}</p>
          </div>
        </section>

        <section className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_50%_12%,rgba(212,175,55,0.10),transparent_38%)] p-4 sm:p-8 lg:p-10">
          <div className="w-full max-w-4xl space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {deviceLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="group flex items-center gap-4 rounded-3xl border border-[#D4AF37]/16 bg-[#1A1F2C]/78 p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.22)] transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:border-[#D4AF37]/38 hover:bg-[#20283a]"
                  >
                    <div
                      className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border"
                      style={{ backgroundColor: `${item.color}12`, borderColor: `${item.color}30`, color: item.color }}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D4AF37]">
                        {tr('access.quick')}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-white">{item.label}</h3>
                      <p className="text-sm font-semibold text-[#8b97a8]">{item.desc}</p>
                    </div>
                    <LogIn className="h-5 w-5 text-[#8b97a8] transition group-hover:text-[#D35A37]" />
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
                    className={`group min-h-[138px] rounded-3xl border p-4 text-left shadow-[0_24px_90px_rgba(0,0,0,0.22)] transition-all duration-200 active:scale-[0.98] sm:min-h-[170px] sm:p-5 lg:min-h-[190px] lg:p-6 ${
                      disabled ? 'cursor-not-allowed opacity-55' : 'hover:-translate-y-1 hover:border-[#D4AF37]/38 hover:bg-[#20283a]'
                    }`}
                    style={{
                      background: selected
                        ? `linear-gradient(180deg, ${highlight}26, rgba(26,31,44,0.92))`
                        : 'rgba(26,31,44,0.78)',
                      borderColor: selected ? highlight : 'rgba(212,175,55,0.16)',
                      boxShadow: selected ? `0 26px 90px ${highlight}24` : undefined,
                    }}
                  >
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between gap-4">
                        <div
                          className="grid h-12 w-12 place-items-center rounded-2xl border sm:h-14 sm:w-14 lg:h-16 lg:w-16"
                          style={{
                            backgroundColor: `${role.color}12`,
                            borderColor: `${role.color}30`,
                            color: role.color,
                          }}
                        >
                          <Icon className="h-6 w-6 lg:h-8 lg:w-8" />
                        </div>
                        <LogIn className="h-5 w-5 text-[#8b97a8] transition group-hover:text-[#D35A37]" />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#D4AF37] sm:text-sm sm:tracking-[0.16em]">
                          {role.desc}
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-white sm:mt-2 lg:text-3xl">{role.label}</h3>
                        <p className="mt-2 text-sm font-semibold text-[#8b97a8]">{role.hint}</p>
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
