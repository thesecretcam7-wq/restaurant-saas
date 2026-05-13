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
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_50%_18%,rgba(217,164,65,0.16),transparent_34%),linear-gradient(180deg,#100d08,#040404_56%,#020202)] px-5 text-[#fff4d8]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#d9a441]/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.035)),rgba(17,16,13,0.94)] p-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.48),0_0_70px_rgba(184,92,31,0.22)] backdrop-blur-xl">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-[#070707] shadow-[0_20px_55px_rgba(184,92,31,0.32)] outline outline-1 outline-[#d9a441]/28">
          <EccofoodLogo size="lg" showText={false} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#d9a441]">Eccofood</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-[#fff4d8]">{label}</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-[#fff4d8]/62">{detail}</p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,#8f5c14,#d9a441,#f2cf82)]" />
        </div>
      </section>
    </main>
  );
}
