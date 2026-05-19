'use client';

import EccofoodLogo from '@/components/EccofoodLogo';

interface EccofoodPageLoaderProps {
  label?: string;
  detail?: string;
}

export default function EccofoodPageLoader({
  label = 'Cargando Eccofood',
  detail = 'Preparando una experiencia rapida y segura.',
}: EccofoodPageLoaderProps) {
  return (
    <div className="flex w-full justify-center px-4 py-6">
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
      </section>
    </div>
  );
}
