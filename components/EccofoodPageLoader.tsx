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
    <main className="grid min-h-screen place-items-center bg-[#f7f5f0] px-5 text-[#17120d]">
      <section className="w-full max-w-md rounded-[2rem] border border-black/5 bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(17,17,17,0.12)] backdrop-blur">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[1.75rem] bg-[#111111] shadow-[0_20px_50px_rgba(249,115,22,0.24)]">
          <EccofoodLogo size="lg" showText={false} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f97316]">Eccofood</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{label}</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-black/48">{detail}</p>
        <div className="mt-7 h-2 overflow-hidden rounded-full bg-black/7">
          <div className="h-full w-1/2 animate-[eccoGlobalLoaderBar_1.05s_ease-in-out_infinite] rounded-full bg-[#f97316]" />
        </div>
      </section>
    </main>
  );
}
