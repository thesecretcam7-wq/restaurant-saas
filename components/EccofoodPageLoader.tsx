'use client';

import { useEffect, useState } from 'react';
import EccofoodLogo from '@/components/EccofoodLogo';

interface EccofoodPageLoaderProps {
  label?: string;
  detail?: string;
  mode?: 'page' | 'card';
}

export default function EccofoodPageLoader({
  label = 'Cargando Eccofood',
  detail = 'Preparando una experiencia rapida y segura.',
  mode = 'page',
}: EccofoodPageLoaderProps) {
  const [showRecoveryActions, setShowRecoveryActions] = useState(false);
  const [cleanCacheUrl, setCleanCacheUrl] = useState('/limpiar-cache.html');
  const wrapperClassName = mode === 'page'
    ? 'fixed inset-0 z-[9990] grid h-[100dvh] w-full place-items-center overflow-hidden bg-[#f7f5f0] px-4'
    : 'flex w-full justify-center px-4 py-6'

  useEffect(() => {
    const currentPath = `${window.location.pathname}${window.location.search}`;
    setCleanCacheUrl(`/limpiar-cache.html?to=${encodeURIComponent(currentPath || '/')}`);
    const timer = window.setTimeout(() => setShowRecoveryActions(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className={wrapperClassName}>
      <section className="w-full max-w-[340px] rounded-[1.5rem] border border-orange-200 bg-white px-6 py-5 text-center text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,0.14)]">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-slate-950 shadow-[0_14px_32px_rgba(249,115,22,0.24)]">
          <EccofoodLogo size="md" showText={false} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600">Eccofood</p>
        <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950">{label}</h1>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{detail}</p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full bg-orange-500" />
        </div>
        {showRecoveryActions && (
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
            >
              Reintentar
            </button>
            <a
              href={cleanCacheUrl}
              className="grid h-10 place-items-center rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-black text-orange-700"
            >
              Limpiar cache y abrir
            </a>
            <p className="text-xs font-semibold leading-snug text-slate-400">
              Si el equipo no tiene internet, abre primero una vez con conexion para guardar el TPV.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
