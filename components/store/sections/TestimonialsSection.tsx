import type { TestimonialItem } from '@/lib/pageConfig'

interface Props {
  testimonials: TestimonialItem[]
  primary: string
  title: string
  borderRadius: string
  cardClasses: string
}

export default function TestimonialsSection({ testimonials, primary, title, borderRadius, cardClasses }: Props) {
  if (!testimonials?.length) return null

  return (
    <section className="pt-4 pb-2">
      <div className="px-4 mb-3">
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-2 scrollbar-hide">
        {testimonials.map((t, i) => (
          <div
            key={i}
            className={`flex-shrink-0 w-72 p-4 ${cardClasses}`}
            style={{ borderRadius }}
          >
            {/* Stars */}
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <span key={star} className={`text-sm ${star <= t.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
              ))}
            </div>
            {/* Text */}
            <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-4">&ldquo;{t.text}&rdquo;</p>
            {/* Author */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: `${primary}cc` }}
              >
                {t.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-gray-800">{t.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
