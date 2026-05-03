/**
 * Theme System Tests
 *
 * Tests for theme configuration, validation, and utilities
 */

import {
  ECCOFOOD_LIGHT_THEME,
  ECCOFOOD_DARK_THEME,
  validateTheme,
  mergeTenantTheme,
  getTheme,
  AVAILABLE_THEMES,
} from '../theme'

import {
  validateAllThemes,
  validateAdminSectionColors,
  validateThemeTokenValues,
  isValidColorValue,
  getValidationSummary,
} from '../theme-validation'

import {
  getSectionColor,
  getSectionColorVar,
  detectAdminSection,
  getSectionLabel,
  getSectionIcon,
  isValidSection,
} from '../colors'

describe('Theme System', () => {
  describe('Theme Configuration', () => {
    it('should have valid light theme', () => {
      expect(validateTheme(ECCOFOOD_LIGHT_THEME)).toBe(true)
    })

    it('should have valid dark theme', () => {
      expect(validateTheme(ECCOFOOD_DARK_THEME)).toBe(true)
    })

    it('should have all required tokens in light theme', () => {
      const requiredTokens = [
        'primary',
        'secondary',
        'accent',
        'success',
        'warning',
        'danger',
      ]
      requiredTokens.forEach(token => {
        expect(token in ECCOFOOD_LIGHT_THEME.tokens).toBe(true)
      })
    })

    it('should have all required tokens in dark theme', () => {
      const requiredTokens = [
        'primary',
        'secondary',
        'accent',
        'success',
        'warning',
        'danger',
      ]
      requiredTokens.forEach(token => {
        expect(token in ECCOFOOD_DARK_THEME.tokens).toBe(true)
      })
    })
  })

  describe('Theme Merging', () => {
    it('should merge tenant theme with base theme', () => {
      const tenantColors = { primary: '#FF0000' }
      const merged = mergeTenantTheme(ECCOFOOD_LIGHT_THEME, tenantColors)

      expect(merged.tokens.primary).toBe('#FF0000')
      expect(merged.tokens.secondary).toBe(ECCOFOOD_LIGHT_THEME.tokens.secondary)
    })

    it('should preserve base theme properties when merging', () => {
      const tenantColors = { primary: '#FF0000' }
      const merged = mergeTenantTheme(ECCOFOOD_LIGHT_THEME, tenantColors)

      expect(merged.name).toBe(ECCOFOOD_LIGHT_THEME.name)
      expect(merged.isDark).toBe(ECCOFOOD_LIGHT_THEME.isDark)
    })
  })

  describe('Theme Selection', () => {
    it('should return light theme for "light"', () => {
      const theme = getTheme('light')
      expect(theme.name).toBe('light')
      expect(theme.isDark).toBe(false)
    })

    it('should return dark theme for "dark"', () => {
      const theme = getTheme('dark')
      expect(theme.name).toBe('dark')
      expect(theme.isDark).toBe(true)
    })
  })

  describe('Theme Validation', () => {
    it('should validate all themes', () => {
      const result = validateAllThemes()
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should validate theme token values', () => {
      const result = validateThemeTokenValues()
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should validate color values', () => {
      expect(isValidColorValue('#FF0000')).toBe(true)
      expect(isValidColorValue('#FF0000AA')).toBe(true)
      expect(isValidColorValue('rgb(255, 0, 0)')).toBe(true)
      expect(isValidColorValue('rgba(255, 0, 0, 0.5)')).toBe(true)
      expect(isValidColorValue('var(--color-primary)')).toBe(true)
      expect(isValidColorValue('invalid')).toBe(false)
    })
  })

  describe('Admin Section Colors', () => {
    it('should validate all section colors', () => {
      const result = validateAdminSectionColors()
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should get section color config', () => {
      const config = getSectionColor('dashboard')
      expect(config).toBeDefined()
      expect(config.cssVar).toMatch(/^--/)
      expect(config.label).toBeDefined()
      expect(config.icon).toBeDefined()
    })

    it('should get section color CSS variable', () => {
      const cssVar = getSectionColorVar('pedidos')
      expect(cssVar).toMatch(/^--/)
    })

    it('should detect admin section from pathname', () => {
      expect(detectAdminSection('/admin/pedidos')).toBe('pedidos')
      expect(detectAdminSection('/admin/productos')).toBe('productos')
      expect(detectAdminSection('/admin/clientes')).toBe('clientes')
      expect(detectAdminSection('/unknown')).toBe('dashboard')
    })

    it('should get section label', () => {
      const label = getSectionLabel('pedidos')
      expect(label).toBeTruthy()
      expect(typeof label).toBe('string')
    })

    it('should get section icon', () => {
      const icon = getSectionIcon('pedidos')
      expect(icon).toBeTruthy()
      expect(typeof icon).toBe('string')
    })

    it('should validate section keys', () => {
      expect(isValidSection('dashboard')).toBe(true)
      expect(isValidSection('pedidos')).toBe(true)
      expect(isValidSection('invalid')).toBe(false)
    })
  })

  describe('Validation Summary', () => {
    it('should generate validation summary', () => {
      const summary = getValidationSummary()
      expect(summary.valid).toBe(true)
      expect(summary.errorCount).toBe(0)
    })

    it('should include all validation results', () => {
      const summary = getValidationSummary()
      expect(summary.details).toHaveProperty('themes')
      expect(summary.details).toHaveProperty('sectionColors')
      expect(summary.details).toHaveProperty('tokenValues')
    })
  })
})
