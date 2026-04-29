'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Lock, UtensilsCrossed, CreditCard, LogIn } from 'lucide-react';

interface Props {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  logoUrl: string | null;
}

const ROLE_COLORS = {
  cocinero: 'bg-gradient-to-br from-red-600 to-orange-600',
  camarero: 'bg-gradient-to-br from-red-600 to-orange-600',
  cajero: 'bg-gradient-to-br from-red-600 to-orange-600',
  admin: 'bg-gradient-to-br from-red-600 to-orange-600',
} as const;

export function RoleSelector({ tenantId, tenantName, tenantSlug, logoUrl }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: 'cocinero' as const,
      label: 'Cocinero',
      icon: <ChefHat className="w-10 h-10" />,
      desc: 'Kitchen Display System',
    },
    {
      id: 'camarero' as const,
      label: 'Camarero',
      icon: <UtensilsCrossed className="w-10 h-10" />,
      desc: 'Tomar pedidos y servir',
    },
    {
      id: 'cajero' as const,
      label: 'Cajero',
      icon: <CreditCard className="w-10 h-10" />,
      desc: 'Procesar pagos',
    },
    {
      id: 'admin' as const,
      label: 'Administrador',
      icon: <Lock className="w-10 h-10" />,
      desc: 'Panel de control',
    },
  ];

  function handleSelect(roleId: string) {
    setSelectedRole(roleId);
    router.push(`/${tenantSlug}/acceso/login/${roleId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-red-50/50 to-orange-50/50 flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
        ) : (
          <div className="w-20 h-20 bg-gradient-to-br from-red-600 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
        )}
        <p className="text-gray-500 text-sm">Bienvenido a</p>
        <p className="text-gray-900 font-bold text-3xl">{tenantName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => handleSelect(role.id)}
            disabled={selectedRole !== null}
            className={`bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all shadow-sm ${
              selectedRole ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-white ${ROLE_COLORS[role.id]}`}>
              {role.icon}
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm">{role.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{role.desc}</p>
            </div>
            <LogIn className="w-4 h-4 text-gray-400 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
