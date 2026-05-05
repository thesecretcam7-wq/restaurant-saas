import Link from 'next/link'

interface StoreClosedProps {
  tenantSlug: string
  restaurantName?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
}

export default function StoreClosed({
  tenantSlug,
  restaurantName,
  logoUrl,
  primaryColor = '#E4002B',
}: StoreClosedProps) {
  const name = restaurantName || 'Restaurante'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f6f1] px-5 py-10 text-[#15130f]">
      <section className="w-full max-w-md text-center">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="mx-auto mb-6 max-h-24 max-w-44 object-contain drop-shadow-xl" />
        ) : (
          <div
            className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl text-3xl font-black text-white shadow-xl"
            style={{ backgroundColor: primaryColor || '#E4002B' }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="rounded-2xl border border-black/10 bg-white p-7 shadow-2xl shadow-black/8">
          <p className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: primaryColor || '#E4002B' }}>
            Tienda pausada
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">{name}</h1>
          <p className="mt-4 text-sm font-semibold leading-6 text-black/58">
            En este momento la tienda online no esta disponible. Puedes volver mas tarde o contactar directamente al restaurante.
          </p>
          <Link
            href={`/${tenantSlug}`}
            className="mt-6 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg"
            style={{ backgroundColor: primaryColor || '#E4002B' }}
          >
            Reintentar
          </Link>
        </div>
      </section>
    </main>
  )
}
