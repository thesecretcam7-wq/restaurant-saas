# PWA Assets Generation & Management

## Overview

Your PWA includes automatically generated assets in two categories:
1. **Icons** - Used for app installation and shortcuts
2. **Screenshots** - Displayed in app stores and installation prompts

All assets are **automatically generated** on build time. However, for production, you should replace the placeholder assets with professional versions.

---

## 📱 Icons

### Current Setup

Icons are automatically generated from `public/icons/icon.svg` whenever you run:

```bash
npm run dev
npm run build
npm run generate:assets  # Generate only
```

### Generated Files

| File | Size | Purpose |
|------|------|---------|
| `icon.svg` | Scalable | Source file (you create this) |
| `icon-192.png` | 192×192px | Standard Android icon |
| `icon-512.png` | 512×512px | Large icon (app stores) |
| `shortcut-pedidos.png` | 192×192px | Shortcut: View Orders |
| `shortcut-producto.png` | 192×192px | Shortcut: New Product |

### Creating Your Own Icons

**Option 1: Edit the SVG**
```bash
# Edit: public/icons/icon.svg
# - Change background color (currently #3B82F6)
# - Replace emoji with your own design
# - Keep viewBox="0 0 512 512"
```

**Option 2: Use a Design Tool**
1. Design 512×512px icon in Figma, Adobe XD, or Sketch
2. Export as SVG
3. Replace `public/icons/icon.svg`
4. Run `npm run generate:assets`

**Option 3: Generate from PNG**
```bash
# If you have a high-res PNG (512×512+):
node -e "
const sharp = require('sharp');
sharp('your-icon.png')
  .resize(512, 512)
  .toFile('public/icons/icon.svg');
"
```

### Icon Requirements

✅ **Best Practices:**
- **Square format** (1:1 aspect ratio) for all versions
- **Solid background color** (no transparency) for basic icons
- **High contrast** for visibility at small sizes
- **Simple design** (works at 48×48px)
- **Brand consistent** with your restaurant theme

❌ **Avoid:**
- Text inside the icon (unreadable at small sizes)
- Complex gradients (may not scale well)
- Transparent backgrounds (use solid colors)
- Very thin lines or details

---

## 📸 Screenshots

### Current Setup

Screenshots are automatically generated as placeholders whenever you run the build scripts. In the `public/screenshots/` directory, you'll find:

| File | Dimensions | Purpose |
|------|-----------|---------|
| `admin-dashboard.png` | 540×720 | Mobile view (narrow) |
| `admin-desktop.png` | 1280×720 | Desktop view (wide) |

### Replacing with Real Screenshots

**Step 1: Capture Screenshots**

1. Open the app in browser or phone
2. Navigate to `/[domain]/(admin)/dashboard`
3. Take screenshots:
   - **Mobile**: 540×720px (portrait)
   - **Desktop**: 1280×720px (landscape)
4. Save as PNG

**Step 2: Optimize Images**

```bash
# Use ImageMagick or ImageOptim to reduce file size
# Recommended: Keep under 500KB per file

# With ImageMagick:
convert admin-dashboard.png -quality 85 admin-dashboard.png

# With sharp (Node.js):
node -e "
const sharp = require('sharp');
sharp('admin-dashboard.png')
  .png({ quality: 85 })
  .toFile('admin-dashboard-optimized.png');
"
```

**Step 3: Replace Files**

```bash
# Copy optimized screenshots to:
cp admin-dashboard.png public/screenshots/
cp admin-desktop.png public/screenshots/

# Or use the upload approach:
# public/screenshots/admin-dashboard.png (540×720)
# public/screenshots/admin-desktop.png (1280×720)
```

### Screenshot Best Practices

✅ **What Users See:**
- Clear view of main dashboard
- Visible menu items and buttons
- Professional layout
- Good contrast and readability

✅ **Do:**
- Show the most important features (orders, stats)
- Include app header with branding
- Use high-quality, crisp text
- Ensure consistent design between screenshots

❌ **Don't:**
- Include sensitive data (real customer info, phone numbers)
- Use very small fonts (unreadable at small sizes)
- Have too much clutter
- Use outdated UI

### Screenshot Sizes Reference

**Mobile (Narrow Form Factor):**
- 540×720px (recommended for PWA)
- 9:12 aspect ratio
- Typical phone portrait view

**Desktop (Wide Form Factor):**
- 1280×720px (recommended for PWA)
- 16:9 aspect ratio
- Typical desktop/tablet landscape view

### Automation Script

To simplify screenshot replacement, use:

```bash
# Copy your real screenshots
node scripts/update-screenshots.js admin-dashboard.png admin-desktop.png
```

---

## 🔄 Build-Time Generation

The icon and screenshot generation happens automatically:

```bash
# In package.json:
{
  "scripts": {
    "dev": "node scripts/generate-icons.js && node scripts/generate-screenshots.js && next dev",
    "build": "node scripts/generate-icons.js && node scripts/generate-screenshots.js && next build",
    "generate:assets": "node scripts/generate-icons.js && node scripts/generate-screenshots.js"
  }
}
```

### How It Works

1. **generate-icons.js**
   - Reads `public/icons/icon.svg`
   - Resizes to 192×192, 512×512, and shortcuts
   - Saves PNG versions

2. **generate-screenshots.js**
   - Generates placeholder screenshots (if they don't exist)
   - Useful for development
   - **Replace with real screenshots for production**

### Development vs Production

**Development Mode:**
```bash
npm run dev
# Generates placeholder assets
# Fast iteration for testing
```

**Production Mode:**
```bash
# Before deploying:
1. Update public/icons/icon.svg with your design
2. Replace public/screenshots/ with real screenshots
3. npm run build
4. Deploy to Vercel
```

---

## 📋 Checklist for Launch

Before going to production:

- [ ] **Icon Created**
  - [ ] Design approved
  - [ ] SVG placed at `public/icons/icon.svg`
  - [ ] Test: `npm run generate:assets`
  - [ ] PNG files generated correctly

- [ ] **Screenshots Captured**
  - [ ] Mobile screenshot: 540×720px
  - [ ] Desktop screenshot: 1280×720px
  - [ ] Placed in `public/screenshots/`
  - [ ] Optimized for web (< 500KB each)
  - [ ] No sensitive data visible

- [ ] **Manifest Updated**
  - [ ] App name correct
  - [ ] Description clear
  - [ ] Categories match your business
  - [ ] Shortcuts helpful

- [ ] **Testing**
  - [ ] Install on Android
  - [ ] Install on iOS
  - [ ] Desktop installation
  - [ ] Screenshots appear in install prompt

---

## 🚀 Advanced: Customizing Assets per Tenant

For multi-tenant SaaS, you may want tenant-specific icons:

```typescript
// In app/[domain]/layout.tsx
const getTenantIcon = async (tenantId: string) => {
  const icon = await supabase
    .from('tenant_assets')
    .select('icon_url')
    .eq('tenant_id', tenantId)
    .single();

  return icon?.icon_url || '/icons/icon-512.png'; // Fallback
};
```

Then update manifest dynamically:

```typescript
export async function generateMetadata({ params }) {
  const icon = await getTenantIcon(params.domain);

  return {
    metadataBase: new URL(`https://${params.domain}`),
    manifest: {
      icons: [{ src: icon, sizes: '512x512' }],
      // ... other config
    }
  };
}
```

---

## 📚 Resources

### PWA Icon Guidelines
- [MDN: Web App Manifest - Icons](https://developer.mozilla.org/en-US/docs/Web/Manifest/icons)
- [Web.dev: Installable PWAs](https://web.dev/progressive-web-apps/)
- [PWA Builder: Icon Generator](https://www.pwabuilder.com/)

### Asset Generation Tools
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing (we use this)
- [ImageOptim](https://imageoptim.com/) - Image optimization
- [Favicon Generator](https://realfavicongenerator.net/) - Multi-format icons

### Design Tools
- [Figma PWA Icon Template](https://www.figma.com/community)
- [Adobe Express](https://www.adobe.com/express/)
- [Canva](https://www.canva.com/)

---

## ❓ Troubleshooting

### Icons not updating
```bash
# Clear build cache and regenerate
rm -rf .next public/icons/*.png
npm run generate:assets
npm run dev
```

### Screenshots not showing in app stores
- Ensure files are exactly 540×720 and 1280×720 px
- Check file format is PNG
- File size should be reasonable (< 500KB)
- Wait 24-48 hours for app store to cache updates

### Icon looks pixelated
- Ensure SVG is high quality
- Use vector-based design, not rasterized
- Test on different devices before production
- Consider using Adobe Illustrator or Figma for SVG creation

### Generation script fails
```bash
# Reinstall sharp
npm install sharp --save-dev

# Try again
npm run generate:assets
```

---

## Summary

Your PWA has **automated asset generation** that:
1. ✅ Generates icons automatically from SVG
2. ✅ Creates screenshots for app stores
3. ✅ Runs on every `npm run dev` and `npm run build`
4. ✅ Can be customized anytime

**For production:** Replace placeholders with professional assets and redeploy.

**For development:** Use generated placeholders for quick testing.

That's it! Your PWA is asset-complete. 🚀
