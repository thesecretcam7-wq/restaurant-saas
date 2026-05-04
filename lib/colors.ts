/**
 * Admin Section Color System
 *
 * Maps admin sections to their CSS variable tokens.
 * All colors are now CSS variable references, not hardcoded hex values.
 *
 * IMPORTANT: Do not add hex colors here. Add them to globals.css instead.
 * This file only maps sections to CSS variable names.
 */

/**
 * Admin Section Color Configuration
 * Maps section names to their CSS variable names and metadata
 */
export const ADMIN_SECTION_COLORS = {
  dashboard: {
    cssVar: '--color-section-dashboard',
    label: 'Panel',
    icon: '📊',
  },
  pedidos: {
    cssVar: '--color-section-orders',
    label: 'Órdenes',
    icon: '📦',
  },
  productos: {
    cssVar: '--color-section-products',
    label: 'Productos',
    icon: '🍔',
  },
  clientes: {
    cssVar: '--color-section-customers',
    label: 'Clientes',
    icon: '👥',
  },
  reservas: {
    cssVar: '--color-section-reservations',
    label: 'Reservas',
    icon: '📅',
  },
  inventario: {
    cssVar: '--color-section-inventory',
    label: 'Inventario',
    icon: '📦',
  },
  ventas: {
    cssVar: '--color-section-sales',
    label: 'Ventas',
    icon: '💰',
  },
  configuracion: {
    cssVar: '--color-section-settings',
    label: 'Configuración',
    icon: '⚙️',
  },
  cierres: {
    cssVar: '--color-section-sales',
    label: 'Cierres',
    icon: '🔐',
  },
  kds: {
    cssVar: '--color-section-orders',
    label: 'Cocina',
    icon: '👨‍🍳',
  },
  pos: {
    cssVar: '--color-section-orders',
    label: 'TPV',
    icon: '💳',
  },
  analytics: {
    cssVar: '--color-section-analytics',
    label: 'Analytics',
    icon: '📈',
  },
  staff: {
    cssVar: '--color-section-staff',
    label: 'Personal',
    icon: '👔',
  },
  payments: {
    cssVar: '--color-section-payments',
    label: 'Pagos',
    icon: '💸',
  },
} as const

export type SectionKey = keyof typeof ADMIN_SECTION_COLORS

/**
 * Get section color configuration by name
 * @param section - Section name or pathname
 * @returns Color configuration with CSS variable and metadata
 */
export function getSectionColor(section: string) {
  const key = detectAdminSection(section)
  return ADMIN_SECTION_COLORS[key] || ADMIN_SECTION_COLORS.dashboard
}

/**
 * Get CSS variable name for a section
 * Use this to apply dynamic colors via CSS
 * @param section - Section name or pathname
 * @returns CSS variable name (e.g., '--color-section-orders')
 */
export function getSectionColorVar(section: string): string {
  const config = getSectionColor(section)
  return config.cssVar
}

/**
 * Get CSS variable as inline style object
 * Useful for React inline styles
 * @param section - Section name or pathname
 * @returns Object for use in style prop: { color: 'var(--color-section-orders)' }
 */
export function getSectionColorStyle(section: string) {
  const cssVar = getSectionColorVar(section)
  return {
    color: `var(${cssVar})`,
    borderColor: `var(${cssVar})`,
    backgroundColor: `var(${cssVar})`,
  }
}

/**
 * Detect current admin section from pathname
 * @param pathname - URL pathname (e.g., '/admin/pedidos/123')
 * @returns Section key for color mapping
 */
export function detectAdminSection(pathname: string): SectionKey {
  const lower = pathname.toLowerCase()

  // Match specific admin sections
  if (lower.includes('/dashboard')) return 'dashboard'
  if (lower.includes('/pedidos')) return 'pedidos'
  if (lower.includes('/productos')) return 'productos'
  if (lower.includes('/clientes')) return 'clientes'
  if (lower.includes('/reservas')) return 'reservas'
  if (lower.includes('/inventario')) return 'inventario'
  if (lower.includes('/ventas')) return 'ventas'
  if (lower.includes('/cierres')) return 'cierres'
  if (lower.includes('/configuracion')) return 'configuracion'
  if (lower.includes('/analytics')) return 'analytics'
  if (lower.includes('/staff')) return 'staff'
  if (lower.includes('/kds')) return 'kds'
  if (lower.includes('/kitchen')) return 'kds'
  if (lower.includes('/pos')) return 'pos'
  if (lower.includes('/payments')) return 'payments'

  return 'dashboard' // Default fallback
}

/**
 * Get section label (localized display name)
 * @param section - Section name or pathname
 * @returns Human-readable section label
 */
export function getSectionLabel(section: string): string {
  const config = getSectionColor(section)
  return config.label
}

/**
 * Get section icon emoji
 * @param section - Section name or pathname
 * @returns Emoji icon for the section
 */
export function getSectionIcon(section: string): string {
  const config = getSectionColor(section)
  return config.icon
}

/**
 * Get all available sections
 * @returns Array of all section keys
 */
export function getAllSections(): SectionKey[] {
  return Object.keys(ADMIN_SECTION_COLORS) as SectionKey[]
}

/**
 * Validate if a section key is valid
 * @param section - Section to validate
 * @returns true if valid section key
 */
export function isValidSection(section: unknown): section is SectionKey {
  return typeof section === 'string' && section in ADMIN_SECTION_COLORS
}

/**
 * Legacy function for backwards compatibility
 * @deprecated Use getSectionColorVar instead
 */
export function getCSSVariable(section: string): string {
  return getSectionColorVar(section)
}
