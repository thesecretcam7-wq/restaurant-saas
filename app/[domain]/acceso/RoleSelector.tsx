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

export function RoleSelector({ tenantId, tenantName, tenantSlug, logoUrl }: Props) {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    {
      id: 'cocinero',
      label: 'Cocinero',
      icon: <ChefHat className="w-10 h-10" />,
      desc: 'Kitchen Display System',
      color: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-950',
    },
    {
      id: 'camarero',
      label: 'Camarero',
      icon: <UtensilsCrossed className="w-10 h-10" />,
      desc: 'Tomar pedidos y servir',
      color: 'from-emerald-600 to-emerald-700',
      bg: 'bg-emerald-950',
    },
    {
      id: 'cajero',
      label: 'Cajero',
      icon: <CreditCard className="w-10 h-10" />,
      desc: 'Procesar pagos',
      color: 'from-indigo-600 to-indigo-700',
      bg: 'bg-indigo-950',
    },
    {
      id: 'admin',
      label: 'Administrador',
      icon: <Lock className="w-10 h-10" />,
      desc: 'Panel de control',
      color: 'from-slate-600 to-slate-700',
      bg: 'bg-slate-950',
    },
  ];

  function handleSelect(roleId: string) {
    setSelectedRole(roleId);
    router.push(`/${tenantId}/acceso/login/${roleId}`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="mb-10 text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={tenantName} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
        ) : (
          <div className="w-20 h-20 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
        )}
        <p className="text-gray-400 text-sm">Bienvenido a</p>
        <p className="text-white font-bold text-3xl">{tenantName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {roles.map(role => (
          <button
            key={role.id}
            onClick={() => handleSelect(role.id)}
            disabled={selectedRole !== null}
            className={`${role.bg} border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 active:scale-95 transition-all ${
              selectedRole ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'
            }`}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${role.color} rounded-xl flex items-center justify-center text-white`}>
              {role.icon}
            </div>
            <div>
              <p className="text-white font-bold text-sm">{role.label}</p>
              <p className="text-gray-400 text-xs mt-0.5">{role.desc}</p>
            </div>
            <LogIn className="w-4 h-4 text-gray-500 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}
