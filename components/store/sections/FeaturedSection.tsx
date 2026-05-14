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
  basePath?: string
}

export default function FeaturedSection({ tenantId, items, primary, buttonColor = primary, priceColor = primary, title, borderRadius, cardClasses, animations, currencyInfo, basePath }: Props) {
  const money = (value: number) => formatPriceWithCurrency(Number(value || 0), currencyInfo?.code || 'EUR', currencyInfo?.locale || 'es-ES')
  const pathBase = basePath ?? `/${tenantId}`
  const carouselItems = items.length > 1 ? [...items, ...items] : items

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
      <style>{`
        @keyframes homeFeaturedAutoSlide {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-50%, 0, 0); }
        }
        .home-featured-track {
          display: flex;
          width: max-content;
          will-change: transform;
          animation: homeFeaturedAutoSlide ${Math.max(items.length * 2.5, 12)}s linear infinite;
        }
        .home-featured-track > * {
          flex: 0 0 min(82vw, 24rem);
        }
        @media (min-width: 640px) {
          .home-featured-track > * { flex-basis: 22rem; }
        }
        @media (min-width: 1024px) {
          .home-featured-track > * { flex-basis: 18rem; }
        }
        .home-featured-carousel:hover .home-featured-track {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .home-featured-track { animation: none; width: auto; }
        }
      `}</style>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-black/42">Recomendados</p>
          <h2 className="mt-1 text-2xl font-black text-[#15130f] sm:text-3xl">{title}</h2>
        </div>
        <Link href={`${pathBase}/menu`} className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm font-black transition hover:bg-black/[0.04]" style={{ color: buttonColor }}>
          Ver todo
        </Link>
      </div>
      <div className="home-featured-carousel -mx-2 overflow-hidden px-2">
        <div className="home-featured-track flex gap-4">
        {carouselItems.map((item, i) => (
          <Link
            key={`${item.id}-${i}`}
            href={`${pathBase}/menu`}
            className={`group overflow-hidden border border-black/8 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl ${cardClasses}`}
            style={{
              borderRadius,
              animationDelay: animations ? `${(i % items.length) * 60}ms` : undefined,
              backgroundImage: `linear-gradient(135deg, ${primary}12, transparent 58%)`,
            }}
          >
            {item.image_url ? (
              <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.03]">
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/10 to-transparent" />
                <span className="absolute bottom-2 left-2 rounded-full bg-white/92 px-3 py-1.5 text-sm font-black shadow-lg backdrop-blur" style={{ color: priceColor }}>
                  {money(item.price)}
                </span>
              </div>
            ) : (
              <div className="aspect-[4/3]" style={{ background: `linear-gradient(135deg, ${primary}22, ${priceColor}18)` }} />
            )}
            <div className="p-3.5">
              <p className="line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#15130f]">{item.name}</p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className={`text-base font-black ${item.image_url ? 'sr-only' : ''}`} style={{ color: priceColor }}>{money(item.price)}</p>
                <AddToCartButton item={item} tenantId={tenantId} color={buttonColor} small />
              </div>
            </div>
          </Link>
        ))}
        </div>
      </div>
    </section>
  )
}
