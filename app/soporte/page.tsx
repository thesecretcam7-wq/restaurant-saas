import Link from 'next/link'
import EccofoodLogo from '@/components/EccofoodLogo'
import SupportForm from './SupportForm'

export const metadata = {
  title: 'Soporte | Eccofood',
}

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] text-black">
      <nav className="border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <EccofoodLogo size="sm" />
          </Link>
          <Link href="/login" className="rounded-xl border border-black/10 px-4 py-2 text-sm font-black text-black/64">
            Entrar
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
        <div>
          <div className="inline-flex rounded-full border border-[#ff6b1a]/20 bg-[#fff3e8] px-4 py-2 text-xs font-black text-[#c94f0d]">
            Soporte Eccofood
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
            Cuéntanos que necesitas y queda en el panel de seguimiento.
          </h1>
          <p className="mt-5 text-base font-semibold leading-7 text-black/58">
            Este formulario guarda tu pregunta directamente en la bandeja interna de Eccofood para poder responderte y darle seguimiento.
          </p>
          <div className="mt-8 grid gap-3 text-sm font-bold text-black/62">
            <div className="rounded-2xl border border-black/8 bg-white p-4">Dudas de planes o pagos</div>
            <div className="rounded-2xl border border-black/8 bg-white p-4">Ayuda con configuracion del restaurante</div>
            <div className="rounded-2xl border border-black/8 bg-white p-4">Solicitudes de diseño o funciones premium</div>
          </div>
        </div>

        <SupportForm />
      </section>
    </main>
  )
}
