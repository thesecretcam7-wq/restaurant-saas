import type { SocialLinks } from '@/lib/pageConfig'
import { AtSign, Camera, Globe, MapPin, MessageCircle, Music2, Users } from 'lucide-react'

interface Props {
  social: SocialLinks
  primary: string
  title: string
  borderRadius: string
}

const SOCIAL_CONFIG: { key: keyof SocialLinks; label: string; Icon: typeof Camera; color: string }[] = [
  { key: 'instagram', label: 'Instagram', Icon: Camera, color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', Icon: Users, color: '#1877F2' },
  { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, color: '#25D366' },
  { key: 'tiktok', label: 'TikTok', Icon: Music2, color: '#000000' },
  { key: 'twitter', label: 'X', Icon: AtSign, color: '#000000' },
  { key: 'google_maps', label: 'Google Maps', Icon: MapPin, color: '#4285F4' },
  { key: 'website', label: 'Web', Icon: Globe, color: '#6366F1' },
]

export function getActiveSocials(social: SocialLinks) {
  return SOCIAL_CONFIG.filter(item => Boolean(social[item.key]))
}

export default function SocialSection({ social, primary, title, borderRadius }: Props) {
  const activeSocials = getActiveSocials(social)
  if (activeSocials.length === 0) {
    return (
      <section className="px-4 pb-2 pt-4">
        <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
        <div className="py-8 text-center text-sm text-gray-400">Sin enlaces a redes sociales configurados</div>
      </section>
    )
  }

  return (
    <section className="px-4 pb-2 pt-4">
      <h3 className="mb-3 text-lg font-bold text-gray-900">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {activeSocials.map(({ Icon, ...item }) => (
          <a
            key={item.key}
            href={social[item.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2.5 shadow-sm transition-all hover:border-gray-300 active:scale-95"
            style={{ borderRadius, boxShadow: `inset 0 -2px 0 ${primary}12` }}
          >
            <span className="grid size-8 place-items-center rounded-full" style={{ backgroundColor: `${item.color}16`, color: item.color }}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
