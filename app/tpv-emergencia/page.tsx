'use client';

import { useEffect, useState } from 'react';
import { POSTerminal } from '@/components/admin/POSTerminal';
import { getOfflineStorage, type POSBootstrapCache } from '@/lib/offline/storage';

export default function EmergencyPOSPage() {
  const [bootstrap, setBootstrap] = useState<POSBootstrapCache | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getOfflineStorage()
      .getLatestPOSBootstrap()
      .then((data) => {
        if (!cancelled) setBootstrap(data);
      })
      .catch(() => {
        if (!cancelled) setBootstrap(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#020617] px-4 text-center text-white">
        <div className="rounded-2xl border border-cyan-300/20 bg-slate-900 px-6 py-5 text-sm font-black">
          Abriendo TPV de emergencia...
        </div>
      </div>
    );
  }

  if (!bootstrap?.tenantId) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#020617] px-4 text-center text-white">
        <div className="max-w-md rounded-2xl border border-amber-300/25 bg-slate-900 px-6 py-5">
          <h1 className="text-xl font-black">No hay TPV guardado en este ordenador</h1>
          <p className="mt-3 text-sm font-bold text-slate-300">
            Abre el TPV una vez con conexion para guardar los productos y poder usar esta entrada de emergencia.
          </p>
          <a
            href="/login"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-amber-400 px-5 text-sm font-black text-slate-950"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  const tenantSlug = bootstrap.tenant?.slug || 'cafebarelcruce';
  const country = bootstrap.settings?.country || bootstrap.tenant?.country || 'ES';

  return <POSTerminal tenantId={bootstrap.tenantId} tenantSlug={tenantSlug} country={country} />;
}
