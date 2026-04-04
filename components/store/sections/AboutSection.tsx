import type { AboutConfig } from '@/lib/pageConfig'

interface Props {
  about: AboutConfig
  borderRadius: string
  cardClasses: string
}

export default function AboutSection({ about, borderRadius, cardClasses }: Props) {
  if (!about.text) return null

  return (
    <section className="px-4 pt-4 pb-2">
      <div className={`overflow-hidden ${cardClasses}`} style={{ borderRadius }}>
        {about.image_url && (
          <img src={about.image_url} alt={about.title} className="w-full h-48 object-cover" />
        )}
        <div className="p-5">
          <h3 className="font-bold text-gray-900 text-lg mb-2">{about.title}</h3>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{about.text}</p>
        </div>
      </div>
    </section>
  )
}
