/**
 * Theme System for Eccofood
 *
 * Manages design tokens and theme application.
 * Supports multiple themes (light, dark) and per-tenant customization.
 *
 * Usage:
 *   - Get a CSS variable: getCSSVariable('--color-primary')
 *   - Apply theme: applyTheme(ECCOFOOD_LIGHT_THEME)
 *   - Merge tenant colors: mergeTenantTheme(base, { primary: '#FF0000' })
 */

/**
 * Theme Configuration Object
 * Maps semantic token names to their CSS variable references
 */
export interface ThemeConfig {
  name: string
  label: string
  isDark: boolean
  tokens: {
    // Brand Colors
    primary: string
    secondary: string
    accent: string
    // Status Colors
    success: string
    warning: string
    danger: string
    info: string
    // Surfaces
    surfacePrimary: string
    surfaceSecondary: string
    surfaceTertiary: string
    // Borders
    borderLight: string
    borderMedium: string
    borderDark: string
    // Text
    textPrimary: string
    textSecondary: string
    textTertiary: string
    // Page
    bgPage: string
  }
}

/**
 * Default Light Theme - Admin/Store Pages
 */
export const ECCOFOOD_LIGHT_THEME: ThemeConfig = {
  name: 'light',
  label: 'Light Theme',
  isDark: false,
  tokens: {
    primary: 'var(--color-eccofood-red)',
    secondary: 'var(--color-eccofood-orange)',
    accent: 'var(--color-eccofood-yellow)',
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#0891B2',
    surfacePrimary: 'white',
    surfaceSecondary: '#FAFBFC',
    surfaceTertiary: '#F3F4F6',
    borderLight: '#E5E7EB',
    borderMedium: '#D1D5DB',
    borderDark: '#9CA3AF',
    textPrimary: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    bgPage: 'white',
  },
}

/**
 * Dark Theme - Landing Page
 * High contrast, vibrant accent colors
 */
export const ECCOFOOD_DARK_THEME: ThemeConfig = {
  name: 'dark',
  label: 'Dark Theme',
  isDark: true,
  tokens: {
    primary: '#FF6B9D',
    secondary: '#FFB366',
    accent: '#FFE680',
    success: '#4ADE80',
    warning: '#FBBF24',
    danger: '#FF6B6B',
    info: '#00D9FF',
    surfacePrimary: '#1F2937',
    surfaceSecondary: '#111827',
    surfaceTertiary: '#0F172A',
    borderLight: '#374151',
    borderMedium: '#4B5563',
    borderDark: '#6B7280',
    textPrimary: '#F3F4F6',
    textSecondary: '#D1D5DB',
    textTertiary: '#9CA3AF',
    bgPage: '#0F172A',
  },
}

/**
 * Get a CSS variable value from the document
 * @param varName - CSS variable name (e.g., '--color-primary')
 * @returns The CSS variable value or empty string if not found
 */
export function getCSSVariable(varName: string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim()
}

/**
 * Apply theme CSS variables to the document root
 * Useful for dynamic theme switching without page reload
 * @param theme - Theme configuration to apply
 */
export function applyTheme(theme: ThemeConfig): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const cssVars = [
    ['--color-primary', theme.tokens.primary],
    ['--color-secondary', theme.tokens.secondary],
    ['--color-accent', theme.tokens.accent],
    ['--color-success', theme.tokens.success],
    ['--color-warning', theme.tokens.warning],
    ['--color-danger', theme.tokens.danger],
    ['--color-info', theme.tokens.info],
    ['--color-surface-primary', theme.tokens.surfacePrimary],
    ['--color-surface-secondary', theme.tokens.surfaceSecondary],
    ['--color-surface-tertiary', theme.tokens.surfaceTertiary],
    ['--color-border-light', theme.tokens.borderLight],
    ['--color-border-medium', theme.tokens.borderMedium],
    ['--color-border-dark', theme.tokens.borderDark],
    ['--color-text-primary', theme.tokens.textPrimary],
    ['--color-text-secondary', theme.tokens.textSecondary],
    ['--color-text-tertiary', theme.tokens.textTertiary],
    ['--color-bg-page', theme.tokens.bgPage],
  ] as const

  cssVars.forEach(([varName, value]) => {
    root.style.setProperty(varName, value)
  })
}

/**
 * Merge tenant branding with base theme
 * Allows per-tenant color customization
 * @param baseTheme - Base theme to extend
 * @param tenantBranding - Tenant-specific color overrides
 * @returns New theme with merged colors
 */
export function mergeTenantTheme(
  baseTheme: ThemeConfig,
  tenantBranding: Partial<Record<keyof ThemeConfig['tokens'], string>>
): ThemeConfig {
  return {
    ...baseTheme,
    tokens: {
      ...baseTheme.tokens,
      ...tenantBranding,
    },
  }
}

/**
 * Detect theme preference from system or localStorage
 * @returns 'light' or 'dark'
 */
export function detectThemePreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  // Check localStorage first
  const stored = localStorage.getItem('theme-preference')
  if (stored === 'light' || stored === 'dark') return stored

  // Check system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

/**
 * Initialize theme system
 * Applies appropriate theme based on element data-theme attribute or system preference
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  const dataTheme = root.getAttribute('data-theme')

  // If element has data-theme="landing" or data-theme="dark", apply dark theme
  if (dataTheme === 'dark' || dataTheme === 'landing') {
    root.classList.add('dark')
    applyTheme(ECCOFOOD_DARK_THEME)
  } else {
    // Otherwise use light theme (default)
    root.classList.remove('dark')
    applyTheme(ECCOFOOD_LIGHT_THEME)
  }
}

/**
 * Get all available themes
 */
export const AVAILABLE_THEMES = [ECCOFOOD_LIGHT_THEME, ECCOFOOD_DARK_THEME] as const

/**
 * Type-safe theme selector
 */
export function getTheme(themeName: 'light' | 'dark'): ThemeConfig {
  return themeName === 'dark' ? ECCOFOOD_DARK_THEME : ECCOFOOD_LIGHT_THEME
}

/**
 * Validate theme configuration
 * @param theme - Theme to validate
 * @returns true if valid, false otherwise
 */
export function validateTheme(theme: unknown): theme is ThemeConfig {
  if (!theme || typeof theme !== 'object') return false
  const t = theme as Record<string, unknown>
  return (
    typeof t.name === 'string' &&
    typeof t.label === 'string' &&
    typeof t.isDark === 'boolean' &&
    typeof t.tokens === 'object'
  )
}
