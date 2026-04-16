# Eccofood - Brand Guidelines

**Professional Restaurant Management Platform**  
*Making restaurant operations seamless, elegant, and profitable.*

---

## 1. Brand Essence

### Mission
Empower restaurant owners with an intuitive, modern platform that simplifies operations while maintaining their brand identity and maximizing profitability.

### Vision
To become the preferred SaaS platform for premium restaurants worldwide—known for elegant design, seamless functionality, and exceptional customer support.

### Brand Personality
- **Professional**: Trustworthy, competent, detail-oriented
- **Modern**: Forward-thinking, innovative, contemporary
- **Food-Forward**: Passionate about food quality, elegant presentation
- **Sophisticated**: Premium positioning, refined aesthetics
- **Empowering**: Owner-centric, success-focused, collaborative

### Brand Voice
- **Tone**: Professional yet approachable, confident yet humble
- **Language**: Clear, concise, benefit-driven (restaurant owners care about results)
- **Style**: Modern, avoiding jargon; explains complex features simply
- **Examples**: "Streamline orders, not your life" | "Run your restaurant, not spreadsheets"

---

## 2. Visual Identity System

### Color Palette

#### Primary Colors
- **Primary Blue**: `#0066FF` (RGB: 0, 102, 255) — Trust, professionalism, technology
  - Light: `#E6F0FF` | Medium: `#4D94FF` | Dark: `#0052CC`
- **Secondary Green**: `#10B981` (RGB: 16, 185, 129) — Growth, success, food, sustainability
  - Light: `#D1FAE5` | Medium: `#6EE7B7` | Dark: `#059669`

#### Accent Colors
- **Warm Orange**: `#F97316` (RGB: 249, 115, 22) — Energy, food, calls-to-action
  - Light: `#FED7AA` | Dark: `#D97706`
- **Deep Red**: `#DC2626` (RGB: 220, 38, 38) — Alerts, errors, importance
- **Success Teal**: `#06B6D4` (RGB: 6, 182, 212) — Confirmations, completed actions

#### Neutral Palette
- **Dark Gray** (Foreground): `#1F2937` (RGB: 31, 41, 55) — Primary text
- **Light Gray** (Background): `#F9FAFB` (RGB: 249, 250, 251) — Clean backgrounds
- **Border Gray**: `#E5E7EB` (RGB: 229, 231, 235) — Subtle separations
- **Muted Gray**: `#6B7280` (RGB: 107, 114, 128) — Secondary text, hints

#### Advanced Palette
- **Gradient 1** (Primary → Secondary): `#0066FF` → `#10B981` — Modern, growth
- **Gradient 2** (Primary → Orange): `#0066FF` → `#F97316` — Energy to trust
- **Glassmorphism**: `rgba(255, 255, 255, 0.9)` with backdrop blur — Premium feel

### Typography System

#### Font Family Recommendations
- **Headings** (H1-H6): `Inter` or `Poppins` (sans-serif, geometric, modern)
- **Body Text**: `Inter` (highly readable, professional, web-optimized)
- **Monospace** (Code): `Fira Code` or `JetBrains Mono`
- **Fallback Stack**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`

#### Typography Scale
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 (Hero) | 56px | 900 (Black) | 1.1 | -1px |
| H2 (Section) | 42px | 800 (Bold) | 1.2 | -0.5px |
| H3 (Subsection) | 32px | 700 (Bold) | 1.3 | 0 |
| H4 | 24px | 700 (Bold) | 1.4 | 0 |
| Body (Large) | 18px | 500 (Medium) | 1.6 | 0.2px |
| Body (Regular) | 16px | 400 (Regular) | 1.6 | 0.2px |
| Small Text | 14px | 500 (Medium) | 1.5 | 0.3px |
| Caption | 12px | 400 (Regular) | 1.4 | 0.5px |

#### Font Pairing Rules
- Max 2 font families per page
- Use weight variation instead of multiple fonts
- Ensure minimum 16px on mobile, 18px on desktop for body
- Maintain 1.5x+ line height for readability

### Spacing & Layout

#### Base Unit: 4px
- XS: 4px | SM: 8px | MD: 12px | LG: 16px | XL: 24px | 2XL: 32px | 3XL: 48px

#### Border Radius
- Components: 8px (modern, not over-rounded)
- Cards: 12px (slightly more rounded for elevation)
- Buttons: 8px (consistency)
- Inputs: 8px
- No radius: Borders between sections

#### Shadows (Elevation System)
| Level | CSS | Use Case |
|-------|-----|----------|
| Subtle | `0 1px 3px rgba(0,0,0,0.1)` | Cards, dropdowns |
| Elevated | `0 10px 25px rgba(0,0,0,0.1)` | Modals, popovers |
| Floating | `0 20px 40px rgba(0,0,0,0.15)` | Top-level overlays |

---

## 3. Visual Elements & Patterns

### Buttons & CTA
- **Primary (High Emphasis)**: Blue background, white text, 12px padding (horizontal/vertical)
- **Secondary**: White background, blue border, blue text, 12px padding
- **Tertiary**: Transparent, blue text on hover, minimal padding
- **Disabled**: 50% opacity, pointer-events: none
- **State**: All buttons have 200ms transition for hover, 50% scale for active

### Cards & Containers
- **Elevated**: White background, subtle shadow, 12px radius, 16px padding
- **Outlined**: Transparent background, 1px border (E5E7EB), 8px radius
- **Flat**: Light gray background (F9FAFB), no shadow, 8px radius

### Input Fields
- **Style**: 8px radius, 1px border, 12px padding (12px horizontal)
- **Focus State**: Blue border (2px), subtle blue glow (`box-shadow: 0 0 0 3px rgba(0, 102, 255, 0.1)`)
- **Placeholder**: Muted gray text (6B7280)
- **Error State**: Red border + red error text below

### Icons
- **Style**: Outlined, 2px stroke weight, 24x24px default size
- **Colors**: Match text color or use primary blue for interactive icons
- **Spacing**: 8px margin from adjacent text

### Gradients (Premium Feel)
```css
/* Hero Background */
background: linear-gradient(135deg, #0066FF 0%, #10B981 100%);

/* Card Hover Effect */
background: linear-gradient(to bottom, rgba(0, 102, 255, 0.05), transparent);

/* CTA Button */
background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%);
```

---

## 4. Animation & Motion

### Principles
- **Purpose-Driven**: Every animation tells a story or provides feedback
- **Subtle**: 200-300ms for micro-interactions, 400-600ms for transitions
- **Performant**: Use `transform` and `opacity` only (GPU-accelerated)
- **Consistent**: Same animation duration/easing across platform

### Animation Library
| Animation | Duration | Easing | Use |
|-----------|----------|--------|-----|
| Fade In | 300ms | ease-out | Elements entering |
| Slide Up | 400ms | cubic-bezier(0.4, 0, 0.2, 1) | Modals, notifications |
| Scale In | 300ms | cubic-bezier(0.34, 1.56, 0.64, 1) | Buttons on click |
| Bounce | 500ms | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Emphasis (rare) |
| Loader Spin | 2s | linear | Loading spinners |

### Interaction States
- **Hover**: Slight scale (1.02), shadow increase, 200ms
- **Active/Click**: Scale (0.98), immediate feedback
- **Loading**: Spinner animation, disabled state
- **Success**: Green highlight + checkmark, 2s hold then fade
- **Error**: Red shake animation, 400ms, stays until dismissed

---

## 5. Photography & Imagery Style

### Guidelines
- **Style**: Modern, clean, professional food photography with restaurants
- **Color Tone**: Warm, inviting, appetizing; consistent with brand blues/greens
- **Composition**: Human-centric (restaurant owners, staff, customers), lifestyle-focused
- **Mood**: Optimistic, successful, modern restaurant environments
- **Quality**: High resolution (1920px+ width), professional, licensed or original

### Usage
- **Hero Images**: Full-width, 500-700px height, with gradient overlay (brand colors)
- **Feature Cards**: 400x300px, square crop or 4:3 aspect ratio
- **Testimonials**: 80-120px circular avatars with 2px brand blue border
- **Icons**: Custom SVG icons (not stock) that match brand aesthetic

### Image Treatment
- **Overlays**: Semi-transparent brand color (20-30% opacity) for text readability
- **Filters**: Slight saturation increase (+10%) for food photos, decrease (-5%) for UI previews
- **Borders**: 1px subtle shadow or brand gray border for definition

---

## 6. Component Library Aesthetic

### Button Variants
```
Primary (Blue): Solid fill, white text, shadow on hover
Secondary (Green): Outline style, no shadow
Tertiary: Text only, minimal visual weight
Success (Green): Fill, white text, uses success teal
Danger (Red): Fill, white text, urgent styling
Loading: Spinner replaces icon, disabled state
```

### Card Variants
```
Elevated: Shadow + border (subtle), hover lifts
Outlined: Border-only, fills on hover with light blue
Flat: No shadow, flat color, hover changes background
Hoverable: Can trigger actions, cursor: pointer, shadow on hover
```

### Form Styling
```
Inputs: 8px radius, 12px padding, blue focus ring
Labels: 14px medium weight, dark gray, positioned above
Helpers: 12px muted gray below input
Errors: Red text, red border, icon indicator
Success: Green checkmark, green border
```

---

## 7. Dark Mode (Secondary)

### Color Adjustments
- **Background**: `#0F1419` (very dark, not pure black)
- **Foreground**: `#F0F1F3` (off-white, not pure white)
- **Cards**: `#1A202C` (slightly lighter than background)
- **Borders**: `#374151` (lighter, more visible)
- **Shadows**: `rgba(0, 0, 0, 0.3)` (increased opacity)
- **Gradients**: Same hues, darker tints

### Implementation
- Respect `prefers-color-scheme` media query
- Provide manual toggle in settings
- Smooth transition (300ms) when switching modes
- Ensure WCAG AA contrast (4.5:1 min for text)

---

## 8. Accessibility Standards

### Color Contrast
- Text on backgrounds: 4.5:1 ratio minimum
- Interactive elements: 3:1 ratio minimum
- Use color + shape/icon (not color alone) for status indication

### Typography
- Minimum 16px font size on mobile
- Line height ≥ 1.5 for body text
- Avoid ALL CAPS for large blocks of text
- Use semantic HTML (H1-H6, proper heading hierarchy)

### Interaction
- All interactive elements ≥ 44x44px touch target
- Focus states clearly visible (blue outline or border)
- Keyboard navigation fully supported (Tab order logical)
- Loading states and form validation clearly indicated

---

## 9. Usage Rules

### Do's ✓
- Use brand colors in meaningful, purposeful ways
- Maintain consistent spacing and alignment
- Prioritize readability and clarity
- Use rounded corners (8px) consistently
- Implement subtle, purposeful animations
- Test on real devices and browsers
- Use high-quality imagery

### Don'ts ✗
- Don't mix serif and sans-serif fonts
- Don't use shadows excessively (max 2-3 levels)
- Don't create animations longer than 600ms for micro-interactions
- Don't reduce contrast for aesthetic reasons
- Don't use brand colors for non-actionable text
- Don't stretch or distort images
- Don't use neon or fluorescent color combinations

---

## 10. Brand Applications

### Website & SaaS
- Hero section with gradient + imagery
- Clean white backgrounds with subtle shadows
- Blue CTAs, green confirmations
- Smooth scroll animations
- Professional photography throughout

### Marketing Materials
- Blue + green primary color scheme
- Bold typography with proper hierarchy
- Generous whitespace
- Food photography as supporting visual
- Gradient overlays for text readability

### Social Media
- Consistent use of brand colors in graphics
- Professional, high-quality imagery
- Readable typography (minimum 24px)
- Consistent borders/frames
- 1080x1080px IG posts, 1200x630px Facebook

### Email
- Brand blue header with logo
- White background with subtle gray accents
- Green CTAs
- Professional headshots where applicable
- Consistent footer branding

---

## 11. Brand Assets

### Logo
- Horizontal lockup (preferred for web/email)
- Stacked lockup (preferred for small spaces)
- Icon-only mark (for favicons, app icons)
- Minimum size: 120px width
- Clear space: 20px on all sides
- Files: SVG (vector), PNG (white/transparent backgrounds)

### Typography
- Primary: Inter (Google Fonts)
- Fallback: System fonts: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

### Colors
See color palette above (hex codes for web, RGB for print)

### Imagery
- Restaurant photography: Professional, lifestyle-focused
- Food photography: High-quality, appetizing, consistent styling
- People: Diverse, authentic, happy restaurant staff and owners

---

## 12. Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --primary: #0066FF;
  --primary-dark: #0052CC;
  --primary-light: #E6F0FF;
  
  --secondary: #10B981;
  --secondary-dark: #059669;
  --secondary-light: #D1FAE5;
  
  --accent: #F97316;
  --accent-dark: #D97706;
  
  --success: #06B6D4;
  --danger: #DC2626;
  
  --foreground: #1F2937;
  --background: #F9FAFB;
  --border: #E5E7EB;
  --muted: #6B7280;
  
  /* Typography */
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Fira Code", monospace;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;
  
  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-md: 0 10px 25px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.15);
  
  /* Transitions */
  --transition-fast: 200ms ease-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 400ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 13. Maintenance & Updates

### Version History
- **v1.0** (2026-04-16): Initial brand guidelines for Eccofood launch
  - Core color palette defined
  - Typography system established
  - Visual patterns and components documented
  - Animation principles outlined

### Review Schedule
- Quarterly brand audit
- Annual comprehensive review
- Update when new components are added
- Sync with marketing team quarterly

### Contact & Approvals
- Brand Manager: [Your name/email]
- Design Lead: [Your name/email]
- Approvals required for: Logo changes, color palette additions, major component redesigns

---

**Last Updated:** April 16, 2026  
**Next Review:** July 16, 2026
