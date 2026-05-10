import Link from 'next/link'
import { formatPriceWithCurrency } from '@/lib/currency'
import AddToCartButton from '@/components/store/AddToCartButton'

interface Props {
  tenantId: string
  items: any[]
  primary: string
  buttonColor?: string
  priceColor?: string
  title: string
  borderRadius: string
  cardClasses: string
  animations: boolean
  currencyInfo?: { code: string; locale: string }
}

export default function FeaturedSection({ tenantId, items, primary, buttonColor = primary, priceColor = primary, title, borderRadius, cardClasses, animations, currencyInfo }: Props) {
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo?.code || 'EUR', currencyInfo?.locale || 'es-ES')

  if (!items?.length) {
    return (
      <section className="rounded-[28px] border border-black/8 bg-white p-5 shadow-xl shadow-black/[0.04] sm:p-7">
        <h2 className="text-2xl font-black text-[#15130f]">{title}</h2>
        <div className="py-12 text-center text-sm font-bold text-black/45">Sin productos destacados</div>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] border border-black/8 bg-white p-5 shadow-xl shadow-black/[0.04] sm:p-7">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-black/42">Recomendados</p>
          <h2 className="mt-1 text-2xl font-black text-[#15130f] sm:text-3xl">{title}</h2>
        </div>
        <Link href={`/${tenantId}/menu`} className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm font-black transition hover:bg-black/[0.04]" style={{ color: buttonColor }}>
          Ver todo
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={`/${tenantId}/menu`}
            className={`group overflow-hidden border border-black/8 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${cardClasses}`}
            style={{
              borderRadius,
              animationDelay: animations ? `${i * 60}ms` : undefined,
            }}
          >
            {item.image_url ? (
              <div className="aspect-[4/3] overflow-hidden bg-black/[0.03]">
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
            ) : (
              <div className="aspect-[4/3]" style={{ backgroundColor: `${primary}14` }} />
            )}
            <div className="p-3.5">
              <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#15130f]">{item.name}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-base font-black" style={{ color: priceColor }}>{money(item.price)}</p>
                <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
