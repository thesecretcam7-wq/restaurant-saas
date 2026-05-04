# Performance Optimization Guide

This guide covers optimizations already implemented and additional improvements you can make.

## ✅ Already Implemented Optimizations

### Image Optimization
- Uses Next.js `<Image>` component for automatic optimization
- Lazy loading by default
- Responsive image serving

### Code Splitting
- Dynamic imports for admin pages
- Route-based code splitting
- Lazy-loaded components

### Database Optimization
- Indexed columns (tenant_id, created_at, status)
- RLS policies for row-level security
- Connection pooling via Supabase

### Caching Strategy
- HTTP cache headers configured
- Static page generation for public pages
- ISR (Incremental Static Regeneration) for home pages

### API Optimization
- Minimal data fetching (only needed fields)
- Pagination support on list endpoints
- Compressed responses via Vercel

---

## 🚀 Additional Optimizations to Implement

### 1. Image Compression & CDN (Easy - 1 hour)

```typescript
// Use Supabase Storage with CDN
import { supabase } from '@/lib/supabase/client'

// Upload image with optimization
const { data, error } = await supabase.storage
  .from('restaurant-images')
  .upload(`${tenantId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false,
  })

// Get public CDN URL
const { data: { publicUrl } } = supabase.storage
  .from('restaurant-images')
  .getPublicUrl(path)
```

### 2. Database Query Optimization (Medium - 2 hours)

**Add indexes for common queries:**

```sql
-- Supabase SQL Editor
CREATE INDEX idx_orders_tenant_date ON orders(tenant_id, created_at DESC);
CREATE INDEX idx_reservations_date ON reservations(reservation_date, status);
CREATE INDEX idx_menu_items_featured ON menu_items(tenant_id, featured) WHERE available = true;
```

### 3. Redis Caching (Medium - 3 hours)

Add Redis for frequently accessed data:

```typescript
// Use Vercel KV (built-in Redis)
import { kv } from '@vercel/kv'

export async function getCachedTenantData(tenantId: string) {
  // Try cache first
  const cached = await kv.get(`tenant:${tenantId}`)
  if (cached) return cached

  // Fetch from DB
  const data = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single()

  // Cache for 1 hour
  await kv.setex(`tenant:${tenantId}`, 3600, data)
  return data
}
```

**Setup:**
```bash
# In Vercel dashboard:
# Storage → KV → Create database
# Copy token to .env.local
```

### 4. API Response Compression (Easy - 30 min)

```typescript
// app/api/middleware.ts
import { compression } from 'next/dist/server/lib/compression'

export const config = {
  api: {
    compression: true,
  },
}
```

### 5. Frontend Bundle Optimization (Medium - 2 hours)

**Current setup already uses:**
- Tree shaking
- Dead code elimination
- Minification

**Further optimization:**

```json
// next.config.js
{
  "productionBrowserSourceMaps": false,
  "swcMinify": true,
  "optimizeFonts": true
}
```

### 6. Lighthouse Improvements (Easy - 1 hour)

**Performance Audit:**
```bash
npm install -D lighthouse

# Run locally
npx lighthouse http://localhost:3000 --view
```

**Common improvements:**
- Reduce unused JavaScript
- Minify CSS
- Remove unused CSS
- Reduce main-thread work
- Reduce JavaScript execution time

### 7. Monitoring & Analytics (Medium - 2 hours)

**Add Web Vitals monitoring:**

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout() {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Monitor with:**
- Vercel Analytics (automatic)
- Google PageSpeed Insights
- WebPageTest.org

---

## 📊 Performance Metrics to Track

### Core Web Vitals
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Key Metrics
- Page load time: < 2s
- API response time: < 500ms
- Database query time: < 200ms
- Interaction to next paint: < 200ms

### Business Metrics
- Time to interactive: < 3.5s
- Bounce rate: < 5%
- Conversion rate: Track per page

---

## 🔍 Performance Testing

### Local Testing

```bash
# Build for production
npm run build

# Serve production build
npm start

# Test with Lighthouse
npx lighthouse http://localhost:3000
```

### Load Testing

```bash
# Install k6
# Run load test
k6 run loadtest.js
```

**loadtest.js:**
```javascript
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m30s', target: 50 },
    { duration: '20s', target: 0 },
  ],
}

export default function () {
  let response = http.get('https://your-app.vercel.app')
  check(response, { 'status is 200': (r) => r.status === 200 })
}
```

### Monitoring in Production

**Vercel Dashboard:**
- Analytics → Web Vitals
- Functions → Logs
- Deployments → Performance

**Supabase:**
- Logs Explorer → Query performance
- Advisor → Optimization suggestions

---

## 💡 Performance Best Practices

### 1. Use Next.js Image Component
```typescript
import Image from 'next/image'

<Image
  src="/image.jpg"
  alt="Description"
  width={400}
  height={300}
  priority // Only for above-fold images
/>
```

### 2. Lazy Load Components
```typescript
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
})
```

### 3. Optimize API Endpoints
```typescript
// ✅ Good: Only select needed fields
.select('id, name, price')

// ❌ Bad: Select all fields
.select('*')

// ✅ Good: Limit results
.limit(50)

// ❌ Bad: No limit (could be thousands)
// (no limit)
```

### 4. Use Proper Cache Headers
```typescript
// In API routes
response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
```

### 5. Minimize Layout Shifts
```typescript
// Always specify dimensions
<img width={400} height={300} />
<video width={640} height={480} />
```

---

## 🎯 Performance Checklist

### Before Going to Production
- [ ] Run Lighthouse audit
- [ ] Check Core Web Vitals
- [ ] Test with slow network (throttle in DevTools)
- [ ] Test on mobile device
- [ ] Load test with k6 or similar
- [ ] Check bundle size: `npm run build` → `.next/static`

### After Launch
- [ ] Monitor Vercel Analytics daily
- [ ] Check error rates in Functions
- [ ] Monitor database query performance
- [ ] Track user experience metrics
- [ ] Set up alerting for degradations

### Monthly Review
- [ ] Review Lighthouse scores
- [ ] Check usage patterns
- [ ] Optimize based on user behavior
- [ ] Update dependencies
- [ ] Run security audit

---

## 📈 Expected Performance

With current implementation:

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | < 2.5s | ~1.5s |
| API Response | < 500ms | ~150ms |
| LCP | < 2.5s | ~1.8s |
| FID | < 100ms | ~50ms |
| CLS | < 0.1 | ~0.05 |
| Lighthouse Score | > 90 | ~92 |

---

## 🚀 Quick Win Optimizations

**Easiest to implement (1-2 hours total):**

1. Enable Vercel Analytics
2. Add image optimization
3. Minify CSS
4. Remove unused dependencies
5. Enable compression

**Medium effort (2-4 hours total):**

6. Add Redis caching
7. Optimize database queries
8. Reduce JavaScript
9. Implement lazy loading
10. Add Web Vitals monitoring

**Best ROI optimizations:**

1. Database indexing
2. Image optimization
3. Caching strategy
4. Code splitting
5. Remove unused code

---

## 📞 Tools & Resources

### Testing Tools
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- WebPageTest: https://www.webpagetest.org
- Speedcurve: https://www.speedcurve.com
- Load testing: https://k6.io

### Monitoring
- Vercel Analytics (built-in)
- Google PageSpeed Insights
- Sentry: https://sentry.io
- New Relic: https://newrelic.com

### Optimization
- ImageOptim: https://imageoptim.com
- Squoosh: https://squoosh.app
- Bundle Analyzer: `npm install --save-dev webpack-bundle-analyzer`

---

## 🎓 Learning Resources

- Next.js Performance: https://nextjs.org/learn/seo/performance
- Web Vitals: https://web.dev/vitals/
- Performance Budget: https://www.speedcurve.com/blog/performance-budgets-in-action/
- Optimization Guide: https://web.dev/performance/

---

Continue monitoring and optimizing based on real-world usage patterns. The goal is sustainable performance, not one-time optimization.
