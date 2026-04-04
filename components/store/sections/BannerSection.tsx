import type { BannerConfig } from '@/lib/pageConfig'

interface Props {
  banner: BannerConfig
  borderRadius: string
}

export default function BannerSection({ banner, borderRadius }: Props) {
  if (!banner.enabled || !banner.text) return null

  const content = (
    <div
      className="mx-4 px-4 py-3 flex items-center justify-center gap-2 text-sm font-semibold"
      style={{
        backgroundColor: banner.bg_color,
        color: banner.text_color,
        borderRadius,
      }}
    >
      {banner.emoji && <span className="text-lg">{banner.emoji}</span>}
      <span>{banner.text}</span>
    </div>
  )

  if (banner.link) {
    return <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">{content}</a>
  }

  return content
}
