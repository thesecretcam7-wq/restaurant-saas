/**
 * Theme Validation Utilities
 *
 * Validates that the design token system is properly implemented:
 * - All CSS variables are defined
 * - No hardcoded colors in unexpected places
 * - Color values are valid hex/rgb/hsl
 */

import { AVAILABLE_THEMES, validateTheme } from './theme'
import { ADMIN_SECTION_COLORS } from './colors'

/**
 * Validates all theme configurations
 */
export function validateAllThemes(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check all available themes
  for (const theme of AVAILABLE_THEMES as readonly ThemeConfig[]) {
    if (!validateTheme(theme)) {
      errors.push(`Invalid theme configuration: ${theme.name}`)
    }

    // Validate token structure
    const requiredTokens = [
      'primary',
      'secondary',
      'accent',
      'success',
      'warning',
      'danger',
      'info',
      'surfacePrimary',
      'surfaceSecondary',
      'surfaceTertiary',
      'borderLight',
      'borderMedium',
      'borderDark',
      'textPrimary',
      'textSecondary',
      'textTertiary',
      'bgPage',
    ]

    requiredTokens.forEach(token => {
      if (!(token in theme.tokens)) {
        errors.push(`Missing token in ${theme.name} theme: ${token}`)
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates all admin section colors
 */
export function validateAdminSectionColors(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  Object.entries(ADMIN_SECTION_COLORS).forEach(([section, config]) => {
    if (!config.cssVar) {
      errors.push(`Missing CSS variable for section: ${section}`)
    }
    if (!config.label) {
      errors.push(`Missing label for section: ${section}`)
    }
    if (!config.icon) {
      errors.push(`Missing icon for section: ${section}`)
    }

    // CSS variable should start with --
    if (config.cssVar && !config.cssVar.startsWith('--')) {
      errors.push(`Invalid CSS variable name for section ${section}: ${config.cssVar}`)
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validates a color value
 */
export function isValidColorValue(value: string): boolean {
  // CSS variable reference
  if (value.startsWith('var(')) return true

  // Hex color
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)) return true

  // RGB/RGBA
  if (/^rgba?\(/.test(value)) return true

  // HSL/HSLA
  if (/^hsla?\(/.test(value)) return true

  // Named color
  if (/^(white|black|transparent|red|blue|green|yellow|orange|purple|pink)$/i.test(value))
    return true

  // color-mix() function
  if (value.startsWith('color-mix(')) return true

  return false
}

/**
 * Validates all theme token values
 */
export function validateThemeTokenValues(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const theme of AVAILABLE_THEMES as readonly ThemeConfig[]) {
    Object.entries(theme.tokens).forEach(([tokenName, value]) => {
      if (typeof value !== 'string' || !isValidColorValue(value)) {
        errors.push(
          `Invalid color value in ${theme.name} theme for ${tokenName}: ${value}`
        )
      }
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Run all validations
 */
export function runAllValidations() {
  const results = {
    themes: validateAllThemes(),
    sectionColors: validateAdminSectionColors(),
    tokenValues: validateThemeTokenValues(),
  }

  const allValid = Object.values(results).every(r => r.valid)

  if (!allValid) {
    console.error('❌ Theme validation failed:')
    Object.entries(results).forEach(([name, result]) => {
      if (!result.valid) {
        console.error(`\n${name}:`)
        result.errors.forEach(err => console.error(`  - ${err}`))
      }
    })
  } else {
    console.log('✅ All theme validations passed')
  }

  return results
}

/**
 * Export validation summary
 */
export function getValidationSummary() {
  const results = {
    themes: validateAllThemes(),
    sectionColors: validateAdminSectionColors(),
    tokenValues: validateThemeTokenValues(),
  }

  const totalErrors = Object.values(results).reduce(
    (sum, r) => sum + r.errors.length,
    0
  )

  return {
    valid: totalErrors === 0,
    errorCount: totalErrors,
    details: results,
  }
}
