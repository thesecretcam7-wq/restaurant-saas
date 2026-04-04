import type { SocialLinks } from '@/lib/pageConfig'

interface Props {
  social: SocialLinks
  primary: string
  title: string
  borderRadius: string
}

const SOCIAL_CONFIG: { key: keyof SocialLinks; label: string; icon: string; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: '📸', color: '#E4405F' },
  { key: 'facebook', label: 'Facebook', icon: '👤', color: '#1877F2' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', color: '#000000' },
  { key: 'twitter', label: 'X', icon: '𝕏', color: '#000000' },
  { key: 'google_maps', label: 'Google Maps', icon: '📍', color: '#4285F4' },
  { key: 'website', label: 'Web', icon: '🌐', color: '#6366F1' },
]

export default function SocialSection({ social, primary, title, borderRadius }: Props) {
  const activeSocials = SOCIAL_CONFIG.filter(s => social[s.key])
  if (activeSocials.length === 0) return null

  return (
    <section className="px-4 pt-4 pb-2">
      <h3 className="font-bold text-gray-900 text-lg mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {activeSocials.map(s => (
          <a
            key={s.key}
            href={social[s.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 shadow-sm transition-all active:scale-95"
            style={{ borderRadius }}
          >
            <span className="text-lg">{s.icon}</span>
            <span className="text-sm font-semibold text-gray-700">{s.label}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
