# Eccofood Design Token System

> Professional, enterprise-grade theme system with CSS variables as the single source of truth.

## Overview

The Eccofood design token system provides:
- **Unified color management** - Single source of truth in `globals.css`
- **Multi-layer architecture** - Primitive → Semantic → Alias tokens
- **Dynamic theming** - Runtime theme switching without page reload
- **Future multi-tenancy** - Per-tenant color customization support
- **Type-safe utilities** - Full TypeScript support with validation

## Architecture

### Three-Layer Token System

```
Primitive Layer (Brand Foundation)
├── --color-eccofood-red
├── --color-eccofood-orange
└── --color-eccofood-yellow

     ↓

Semantic Layer (Component Intent)
├── --color-primary (→ red)
├── --color-secondary (→ orange)
├── --color-accent (→ yellow)
├── --color-success
├── --color-danger
└── ...

     ↓

Alias Layer (Domain-Specific)
├── --color-section-orders
├── --color-section-products
└── --color-section-customers
```

## Files Overview

### Core Files

**`app/globals.css`** (lines 51-150)
- Contains all CSS variable definitions
- Single source of truth for all colors
- Organized in three layers (primitive, semantic, alias)
- Includes light and dark theme overrides

**`lib/theme.ts`** (250 lines)
- Theme engine with configuration objects
- `ECCOFOOD_LIGHT_THEME` - Admin/store theme
- `ECCOFOOD_DARK_THEME` - Landing page theme
- `applyTheme()` - Runtime theme application
- `mergeTenantTheme()` - Per-tenant customization
- `initializeTheme()` - Theme initialization

**`lib/colors.ts`** (Refactored)
- Admin section color mapping
- `ADMIN_SECTION_COLORS` - Section configurations
- `getSectionColorVar()` - Get CSS variable by section
- `detectAdminSection()` - Detect section from pathname
- `getSectionLabel()` - Get section display name
- `getSectionIcon()` - Get section emoji

**`components/admin/SectionColorProvider.tsx`**
- Client component for dynamic section colors
- Automatically detects current section
- Applies section-specific CSS variables
- Wraps admin pages

### Validation Files

**`lib/theme-validation.ts`**
- `validateAllThemes()` - Verify all theme configs
- `validateAdminSectionColors()` - Check section colors
- `validateThemeTokenValues()` - Validate color values
- `runAllValidations()` - Execute full suite

**`lib/__tests__/theme.test.ts`**
- Complete test suite for theme system
- Tests theme merging, validation, color detection
- Runs with any JavaScript testing framework

## Usage

### In Components

#### Use Semantic Tokens (Recommended)

```tsx
// For text
<p style={{ color: 'var(--color-text-primary)' }}>
  Paragraph text
</p>

// For backgrounds
<div style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
  Secondary surface
</div>

// For borders
<div style={{ borderColor: 'var(--color-border-light)' }}>
  Bordered element
</div>

// For gradients
<button
  style={{
    background: 'linear-gradient(to right, var(--color-primary), var(--color-secondary))',
  }}
>
  Action Button
</button>
```

#### Use Section Colors (Admin Pages)

```tsx
import { getSectionColorVar } from '@/lib/colors'
import { usePathname } from 'next/navigation'

export function SectionBadge() {
  const pathname = usePathname()
  const sectionColorVar = getSectionColorVar(pathname)

  return (
    <div style={{ color: `var(${sectionColorVar})` }}>
      Section Badge
    </div>
  )
}

// Or use the automatic SectionColorProvider:
// <SectionColorProvider>
//   {/* All children automatically get section colors */}
// </SectionColorProvider>
```

#### Use Tailwind with CSS Variables

```tsx
// Tailwind classes work with CSS variables:
<div className="bg-surface-primary text-text-primary border border-border-light">
  Content
</div>

// Custom Tailwind config maps CSS variables to classes
```

### Dynamic Theme Switching

```tsx
import { applyTheme, ECCOFOOD_LIGHT_THEME, ECCOFOOD_DARK_THEME } from '@/lib/theme'

// Switch theme at runtime
function ThemeToggle() {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      applyTheme(ECCOFOOD_LIGHT_THEME)
      document.documentElement.classList.remove('dark')
    } else {
      applyTheme(ECCOFOOD_DARK_THEME)
      document.documentElement.classList.add('dark')
    }
  }

  return <button onClick={toggleTheme}>Toggle Theme</button>
}
```

### Per-Tenant Customization

```tsx
import { mergeTenantTheme, ECCOFOOD_LIGHT_THEME, applyTheme } from '@/lib/theme'

// Customize brand colors for a specific tenant
function applyTenantBranding(tenantBranding: { primary: string; secondary: string }) {
  const customTheme = mergeTenantTheme(ECCOFOOD_LIGHT_THEME, {
    primary: tenantBranding.primary,
    secondary: tenantBranding.secondary,
  })

  applyTheme(customTheme)
}
```

## Available Tokens

### Semantic Tokens

```css
/* Brand Colors */
--color-primary          /* Main brand color (red) */
--color-secondary        /* Secondary brand color (orange) */
--color-accent           /* Accent color (yellow) */

/* Status Colors */
--color-success          /* Success/positive (#16A34A) */
--color-warning          /* Warning (#D97706) */
--color-danger           /* Error/danger (#DC2626) */
--color-info             /* Information (#0891B2) */

/* Interactive States */
--color-button-primary-bg
--color-button-primary-hover
--color-button-secondary-bg
--color-button-secondary-hover

/* Surfaces */
--color-surface-primary      /* Main background (white) */
--color-surface-secondary    /* Secondary surface (#FAFBFC) */
--color-surface-tertiary     /* Tertiary surface (#F3F4F6) */

/* Borders */
--color-border-light    /* Light border (#E5E7EB) */
--color-border-medium   /* Medium border (#D1D5DB) */
--color-border-dark     /* Dark border (#9CA3AF) */

/* Text */
--color-text-primary     /* Main text (#1F2937) */
--color-text-secondary   /* Secondary text (#6B7280) */
--color-text-tertiary    /* Tertiary text (#9CA3AF) */

/* Admin Sections */
--color-section-dashboard     /* Dashboard */
--color-section-orders        /* Orders/Pedidos */
--color-section-products      /* Products */
--color-section-customers     /* Customers */
--color-section-reservations  /* Reservations */
--color-section-inventory     /* Inventory */
--color-section-sales         /* Sales/Ventas */
--color-section-settings      /* Settings */
--color-section-analytics     /* Analytics */
--color-section-staff         /* Staff */
--color-section-payments      /* Payments */
```

## Themes

### Light Theme (Admin/Store)

Professional light theme optimized for productivity and accessibility.

```typescript
ECCOFOOD_LIGHT_THEME = {
  primary: var(--color-eccofood-red),        // #E4002B
  secondary: var(--color-eccofood-orange),   // #FF5500
  accent: var(--color-eccofood-yellow),      // #FFD700
  ...
}
```

### Dark Theme (Landing Page)

High-contrast dark theme for marketing landing page.

```typescript
ECCOFOOD_DARK_THEME = {
  primary: #FF6B9D,
  secondary: #FFB366,
  accent: #FFE680,
  ...
}
```

## Validation

### Run Validation

```typescript
import { runAllValidations, getValidationSummary } from '@/lib/theme-validation'

// Run all validations and log results
runAllValidations()

// Get validation summary
const summary = getValidationSummary()
console.log(`Valid: ${summary.valid}, Errors: ${summary.errorCount}`)
```

### Validation Checks

- ✅ All themes have required tokens
- ✅ All tokens have valid color values
- ✅ All admin sections configured correctly
- ✅ CSS variables match naming convention
- ✅ No orphaned color definitions

## Adding New Colors

### 1. Add Primitive Token (if needed)

In `globals.css`:
```css
:root {
  --color-eccofood-lime: #00FF00;
}
```

### 2. Add Semantic Token

```css
:root {
  --color-lime: var(--color-eccofood-lime);
}
```

### 3. Use in Components

```tsx
<div style={{ color: 'var(--color-lime)' }}>Lime text</div>
```

## Updating Admin Section Colors

To change an admin section color:

1. **Find section in `ADMIN_SECTION_COLORS`** (`lib/colors.ts`)
2. **Update CSS variable reference** (e.g., `--color-section-orders`)
3. **Verify in `globals.css`** that the variable is defined
4. **Run validation** to ensure no conflicts

```typescript
export const ADMIN_SECTION_COLORS = {
  pedidos: {
    cssVar: '--color-section-orders',  // Update this
    label: 'Órdenes',
    icon: '📦',
  },
  // ...
}
```

## Migration Guide (For Old Code)

### Before (Hardcoded Colors)
```tsx
<div className="bg-blue-50 text-blue-900 border border-blue-200">
  Content
</div>
```

### After (CSS Variables)
```tsx
<div style={{
  backgroundColor: 'var(--color-surface-secondary)',
  color: 'var(--color-text-primary)',
  borderColor: 'var(--color-border-light)',
}}>
  Content
</div>
```

## Performance

- **No runtime overhead** - Pure CSS variables (native browser support)
- **No JavaScript parsing** - Colors applied instantly
- **Browser caching** - CSS variables cached like normal CSS
- **Minimal bundle size** - Only ~2KB of theme code

## Browser Support

All modern browsers support CSS variables:
- ✅ Chrome 49+
- ✅ Firefox 31+
- ✅ Safari 9.1+
- ✅ Edge 15+
- ✅ iOS Safari 9.2+
- ✅ Android 62+

## Future Enhancements

### Phase 2: Per-Tenant Customization
- Store brand colors in `tenant_branding` table
- Apply at runtime via theme engine
- Admin UI color picker for restaurant owners

### Phase 3: Theme Builder
- Visual theme editor in admin panel
- Live preview of theme changes
- Save multiple custom themes
- Export theme as JSON

### Phase 4: A/B Testing Themes
- Test different color schemes
- Track conversion metrics
- Auto-select winning theme
- Analytics dashboard

## Troubleshooting

### Colors not appearing?
1. Check CSS variable is defined in `globals.css`
2. Verify variable name syntax: `var(--name)`
3. Check browser DevTools for undefined variables

### Theme not switching?
1. Ensure `applyTheme()` is called with valid theme object
2. Check that document.documentElement is accessible
3. Verify CSS variables are in `:root` selector

### Validation failing?
```bash
# Run validation in Node environment
npm run validate-theme

# Or in component:
import { runAllValidations } from '@/lib/theme-validation'
runAllValidations()
```

## Contributing

When adding new pages or components:

1. **Use CSS variables** - Never hardcode colors
2. **Use semantic tokens** - Match token intent to usage
3. **Test with validation** - Run theme validation suite
4. **Document custom colors** - Add comments if non-standard
5. **Keep consistency** - Match existing patterns

## References

- [CSS Custom Properties (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [WCAG Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Design Tokens Best Practices](https://www.designsystems.com/design-tokens/)
