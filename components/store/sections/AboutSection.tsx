import type { AboutConfig } from '@/lib/pageConfig'

interface Props {
  about: AboutConfig
  borderRadius: string
  cardClasses: string
}

export default function AboutSection({ about, borderRadius, cardClasses }: Props) {
  if (!about.text) {
    return (
      <section className="px-4 pt-4 pb-2">
        <div className={`overflow-hidden ${cardClasses} p-5 text-center text-gray-400 text-sm min-h-24 flex items-center justify-center`} style={{ borderRadius }}>
          Sin contenido en "Sobre nosotros"
        </div>
      </section>
    )
  }

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
