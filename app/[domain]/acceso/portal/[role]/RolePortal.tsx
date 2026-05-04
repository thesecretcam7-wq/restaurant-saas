'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Monitor, ClipboardList, CreditCard, LogOut } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
  role: 'cocinero' | 'camarero' | 'cajero';
}

const ROLE_CONFIG = {
  cocinero: { label: 'Cocinero',  tools: ['kds'] },
  camarero: { label: 'Camarero',  tools: ['comandero', 'kds', 'tpv'] },
  cajero:   { label: 'Cajero',    tools: ['tpv'] },
};

const TOOL_CONFIG = {
  kds: {
    label: 'KDS',
    desc: 'Display de cocina',
    icon: <Monitor className="w-10 h-10" />,
    color: 'from-orange-500 to-orange-600',
    href: (slug: string) => `/${slug}/staff/kds`,
  },
  comandero: {
    label: 'Comandero',
    desc: 'Tomar pedidos de mesa',
    icon: <ClipboardList className="w-10 h-10" />,
    color: 'from-emerald-600 to-emerald-700',
    href: (slug: string) => `/${slug}/kitchen`,
  },
  tpv: {
    label: 'TPV',
    desc: 'Punto de venta y cobros',
    icon: <CreditCard className="w-10 h-10" />,
    color: 'from-indigo-600 to-indigo-700',
    href: (slug: string) => `/${slug}/staff/pos`,
  },
};

export function RolePortal({ tenantId, tenantName, tenantSlug, logoUrl, role }: Props) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const config = ROLE_CONFIG[role];

  useEffect(() => {
    const storedRole = sessionStorage.getItem('staff_role');
    const storedTenant = sessionStorage.getItem('staff_tenant');
    if (storedRole !== role || storedTenant !== tenantId) {
      router.push(`/${tenantSlug}/acceso`);
    }
    setChecking(false);
  }, [tenantId, role, router]);

  async function logout() {
    await fetch('/api/staff/session', { method: 'DELETE' });
    sessionStorage.removeItem('staff_role');
    sessionStorage.removeItem('staff_tenant');
    router.push(`/${tenantSlug}/acceso`);
  }

  if (checking) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p className="text-gray-900 font-bold text-sm">{tenantName}</p>
            <p className="text-gray-500 text-xs">{config.label}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-sm transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        {config.tools.map(toolKey => {
          const tool = TOOL_CONFIG[toolKey as keyof typeof TOOL_CONFIG];
          return (
            <a
              key={toolKey}
              href={tool.href(tenantSlug)}
              className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-5 active:scale-95 transition-all shadow-sm hover:shadow-md hover:border-gray-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${tool.color} rounded-2xl flex items-center justify-center text-white flex-shrink-0`}>
                {tool.icon}
              </div>
              <div className="text-left">
                <p className="text-gray-900 font-bold text-lg">{tool.label}</p>
                <p className="text-gray-500 text-sm">{tool.desc}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
