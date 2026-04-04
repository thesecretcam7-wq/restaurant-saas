import Link from 'next/link'
import { formatPrice } from '@/lib/currency'
import AddToCartButton from '@/components/store/AddToCartButton'

interface Props {
  tenantId: string
  items: any[]
  primary: string
  title: string
  borderRadius: string
  cardClasses: string
  animations: boolean
}

export default function FeaturedSection({ tenantId, items, primary, title, borderRadius, cardClasses, animations }: Props) {
  if (!items?.length) return null

  return (
    <section className="pt-6 pb-2">
      <div className="px-4 flex items-center justify-between mb-3">
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        <Link href={`/${tenantId}/menu`} className="text-sm font-semibold" style={{ color: primary }}>
          Ver todo
        </Link>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((item, i) => (
          <Link
            key={item.id}
            href={`/${tenantId}/menu`}
            className={`flex-shrink-0 w-40 overflow-hidden ${cardClasses} active:scale-[0.97] transition-transform`}
            style={{
              borderRadius,
              animationDelay: animations ? `${i * 60}ms` : undefined,
            }}
          >
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-28 object-cover" />
            ) : (
              <div className="w-full h-28 flex items-center justify-center text-4xl" style={{ backgroundColor: `${primary}12` }}>🍽️</div>
            )}
            <div className="p-2.5">
              <p className="text-xs font-bold text-gray-900 line-clamp-1">{item.name}</p>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-sm font-extrabold" style={{ color: primary }}>{formatPrice(item.price)}</p>
                <AddToCartButton item={item} tenantId={tenantId} color={primary} small />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
