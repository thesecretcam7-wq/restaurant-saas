// ─── PAGE CONFIG: Full customization system for restaurant pages ────────────
// Each restaurant can fully customize their storefront appearance.

export interface HeroConfig {
  style: 'fullImage' | 'gradient' | 'split' | 'minimal' | 'parallax'
  height: 'small' | 'medium' | 'large'  // 35vh, 45vh, 55vh
  overlay_opacity: number                // 0-100
  title_text: string                     // e.g. "Bienvenido a..."
  subtitle_text: string
  cta_primary_text: string               // "Ver Menú"
  cta_secondary_text: string             // "Reservar Mesa"
  show_info_pills: boolean
  show_logo: boolean
  gradient_angle: number                 // 135 default
  image_url?: string                     // Hero image for fullImage style
}

export interface SectionConfig {
  id: string
  type: 'featured' | 'info' | 'actions' | 'about' | 'gallery' | 'hours' | 'social' | 'banner' | 'testimonials'
  enabled: boolean
  order: number
  title: string
  config: Record<string, any>
}

export interface AppearanceConfig {
  theme_mode: 'dark' | 'light'
  border_radius: 'none' | 'small' | 'medium' | 'large'  // 0, 8, 16, 24px
  card_style: 'flat' | 'bordered' | 'shadow' | 'glass'
  button_style: 'rounded' | 'pill' | 'square'
  header_style: 'transparent' | 'solid' | 'colored'
  menu_layout: 'list' | 'grid' | 'compact'
  /** @deprecated Use theme_mode. Kept only for older saved configs. */
  dark_mode: boolean
  animations: boolean
}

export interface SocialLinks {
  instagram?: string
  facebook?: string
  whatsapp?: string
  tiktok?: string
  twitter?: string
  website?: string
  google_maps?: string
}

export interface BannerConfig {
  enabled: boolean
  text: string
  emoji: string
  bg_color: string
  text_color: string
  link?: string
}

export interface AboutConfig {
  title: string
  text: string
  image_url?: string
}

export interface GalleryConfig {
  images: string[]
  style: 'grid' | 'carousel' | 'masonry'
}

export interface TestimonialItem {
  name: string
  text: string
  rating: number   // 1-5
  avatar?: string
}

export interface FooterConfig {
  show_powered_by: boolean
  custom_text: string
}

export interface PageConfig {
  hero: HeroConfig
  sections: SectionConfig[]
  appearance: AppearanceConfig
  social: SocialLinks
  banner: BannerConfig
  about: AboutConfig
  gallery: GalleryConfig
  testimonials: TestimonialItem[]
  footer: FooterConfig
}

// ─── DEFAULT CONFIG ─────────────────────────────────────────────────────────

export const DEFAULT_PAGE_CONFIG: PageConfig = {
  hero: {
    style: 'fullImage',
    height: 'large',
    overlay_opacity: 55,
    title_text: '',              // empty = use restaurant name
    subtitle_text: '',           // empty = use tagline
    cta_primary_text: 'Ver Menú',
    cta_secondary_text: 'Reservar Mesa',
    show_info_pills: true,
    show_logo: true,
    gradient_angle: 135,
  },
  sections: [
    { id: 'banner', type: 'banner', enabled: false, order: 0, title: 'Anuncio', config: {} },
    { id: 'featured', type: 'featured', enabled: true, order: 1, title: 'Lo más pedido', config: { count: 8 } },
    { id: 'about', type: 'about', enabled: false, order: 2, title: 'Sobre nosotros', config: {} },
    { id: 'info', type: 'info', enabled: true, order: 3, title: 'Información', config: {} },
    { id: 'gallery', type: 'gallery', enabled: false, order: 4, title: 'Galería', config: {} },
    { id: 'hours', type: 'hours', enabled: false, order: 5, title: 'Horarios', config: {} },
    { id: 'testimonials', type: 'testimonials', enabled: false, order: 6, title: 'Opiniones', config: {} },
    { id: 'actions', type: 'actions', enabled: true, order: 7, title: 'Acciones rápidas', config: {} },
    { id: 'social', type: 'social', enabled: false, order: 8, title: 'Síguenos', config: {} },
  ],
  appearance: {
    theme_mode: 'dark',
    border_radius: 'large',
    card_style: 'bordered',
    button_style: 'rounded',
    header_style: 'solid',
    menu_layout: 'list',
    dark_mode: true,
    animations: true,
  },
  social: {},
  banner: {
    enabled: false,
    text: '',
    emoji: '🔥',
    bg_color: '#FEF3C7',
    text_color: '#92400E',
  },
  about: {
    title: 'Nuestra historia',
    text: '',
  },
  gallery: {
    images: [],
    style: 'grid',
  },
  testimonials: [],
  footer: {
    show_powered_by: true,
    custom_text: '',
  },
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

export function getPageConfig(raw: any): PageConfig {
  if (!raw) return { ...DEFAULT_PAGE_CONFIG }
  const rawAppearance = raw.appearance || {}
  const themeMode = rawAppearance.theme_mode === 'light'
    ? 'light'
    : rawAppearance.theme_mode === 'dark'
      ? 'dark'
      : rawAppearance.dark_mode === false
        ? 'light'
        : 'dark'
  // Deep merge with defaults so new fields always have values
  return {
    hero: { ...DEFAULT_PAGE_CONFIG.hero, ...(raw.hero || {}) },
    sections: raw.sections?.length ? raw.sections : DEFAULT_PAGE_CONFIG.sections,
    appearance: { ...DEFAULT_PAGE_CONFIG.appearance, ...rawAppearance, theme_mode: themeMode, dark_mode: themeMode === 'dark' },
    social: { ...DEFAULT_PAGE_CONFIG.social, ...(raw.social || {}) },
    banner: { ...DEFAULT_PAGE_CONFIG.banner, ...(raw.banner || {}) },
    about: { ...DEFAULT_PAGE_CONFIG.about, ...(raw.about || {}) },
    gallery: { ...DEFAULT_PAGE_CONFIG.gallery, ...(raw.gallery || {}) },
    testimonials: raw.testimonials || [],
    footer: { ...DEFAULT_PAGE_CONFIG.footer, ...(raw.footer || {}) },
  }
}

export function getBorderRadius(style: AppearanceConfig['border_radius']): string {
  switch (style) {
    case 'none': return '0px'
    case 'small': return '8px'
    case 'medium': return '16px'
    case 'large': return '24px'
    default: return '16px'
  }
}

export function getHeroHeight(size: HeroConfig['height']): string {
  switch (size) {
    case 'small': return '35vh'
    case 'medium': return '45vh'
    case 'large': return '55vh'
    default: return '45vh'
  }
}

export function getCardClasses(style: AppearanceConfig['card_style']): string {
  switch (style) {
    case 'flat': return 'bg-white'
    case 'bordered': return 'bg-white border border-gray-100'
    case 'shadow': return 'bg-white shadow-md'
    case 'glass': return 'bg-white/80 backdrop-blur-lg border border-white/40'
    default: return 'bg-white border border-gray-100'
  }
}

export function getButtonClasses(style: AppearanceConfig['button_style']): string {
  switch (style) {
    case 'rounded': return 'rounded-xl'
    case 'pill': return 'rounded-full'
    case 'square': return 'rounded-lg'
    default: return 'rounded-xl'
  }
}

// Section type labels and icons for the admin builder
export const SECTION_META: Record<string, { label: string; icon: string; description: string }> = {
  banner: { label: 'Anuncio', icon: '📢', description: 'Barra superior con mensaje destacado' },
  featured: { label: 'Destacados', icon: '⭐', description: 'Productos más populares en carrusel' },
  about: { label: 'Sobre nosotros', icon: '📖', description: 'Historia y descripción del restaurante' },
  info: { label: 'Información', icon: '📍', description: 'Dirección, teléfono y datos de contacto' },
  gallery: { label: 'Galería', icon: '🖼️', description: 'Fotos del restaurante y platos' },
  hours: { label: 'Horarios', icon: '🕐', description: 'Horario de atención' },
  testimonials: { label: 'Opiniones', icon: '💬', description: 'Comentarios y calificaciones de clientes' },
  actions: { label: 'Acciones', icon: '🎯', description: 'Botones de acceso rápido (menú, reservar)' },
  social: { label: 'Redes sociales', icon: '📱', description: 'Enlaces a Instagram, WhatsApp, etc.' },
}
