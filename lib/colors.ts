// Color system for admin sections
// Each admin section has its own accent color for visual differentiation

export const SECTION_COLORS = {
  dashboard: { hex: '#475569', name: 'Slate', tailwind: 'slate-600' },
  pedidos: { hex: '#D97706', name: 'Amber', tailwind: 'amber-600' },
  productos: { hex: '#059669', name: 'Emerald', tailwind: 'emerald-600' },
  clientes: { hex: '#4F46E5', name: 'Indigo', tailwind: 'indigo-600' },
  reservas: { hex: '#7C3AED', name: 'Violet', tailwind: 'violet-600' },
  inventario: { hex: '#0891B2', name: 'Cyan', tailwind: 'cyan-600' },
  ventas: { hex: '#16A34A', name: 'Green', tailwind: 'green-600' },
  configuracion: { hex: '#374151', name: 'Gray', tailwind: 'gray-700' },
  cierres: { hex: '#16A34A', name: 'Green', tailwind: 'green-600' },
  kds: { hex: '#D97706', name: 'Amber', tailwind: 'amber-600' },
  pos: { hex: '#D97706', name: 'Amber', tailwind: 'amber-600' },
} as const

export type SectionKey = keyof typeof SECTION_COLORS

// Get color for a section
export function getSectionColor(section: string): (typeof SECTION_COLORS)[SectionKey] {
  const key = section.toLowerCase().replace(/[^a-z]/g, '') as SectionKey
  return SECTION_COLORS[key] || SECTION_COLORS.dashboard
}

// Get hex color by section
export function getSectionColorHex(section: string): string {
  return getSectionColor(section).hex
}

// Get tailwind class by section
export function getSectionColorTailwind(section: string): string {
  return getSectionColor(section).tailwind
}

// Detect current admin section from pathname
export function detectAdminSection(pathname: string): SectionKey {
  if (pathname.includes('/dashboard')) return 'dashboard'
  if (pathname.includes('/pedidos')) return 'pedidos'
  if (pathname.includes('/productos')) return 'productos'
  if (pathname.includes('/clientes')) return 'clientes'
  if (pathname.includes('/reservas')) return 'reservas'
  if (pathname.includes('/inventario')) return 'inventario'
  if (pathname.includes('/ventas')) return 'ventas'
  if (pathname.includes('/cierres')) return 'cierres'
  if (pathname.includes('/configuracion')) return 'configuracion'
  if (pathname.includes('/kds')) return 'kds'
  if (pathname.includes('/pos')) return 'pos'
  return 'dashboard'
}

// CSS variable names for each section
export function getCSSVariable(section: string): string {
  const sectionKey = detectAdminSection(section)
  const colorMap: Record<SectionKey, string> = {
    dashboard: '--color-dashboard',
    pedidos: '--color-orders',
    productos: '--color-products',
    clientes: '--color-customers',
    reservas: '--color-reservations',
    inventario: '--color-inventory',
    ventas: '--color-payments',
    configuracion: '--color-settings',
    cierres: '--color-payments',
    kds: '--color-orders',
    pos: '--color-orders',
  }
  return colorMap[sectionKey]
}
