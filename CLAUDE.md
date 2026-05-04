# Eccofood - Development Notes

## Project Overview
Multi-tenant SaaS platform for restaurants - similar to Shopify but for restaurants.

### Key Features
- Multi-tenant architecture with custom domains (CNAME)
- Stripe Connected Accounts for direct payments to each restaurant
- B2B subscription model (basic/pro/premium)
- Full branding customization (colors, fonts, logo, texts)
- Optional delivery and reservations system
- Complete admin panel for product/order/reservation management

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (serverless)
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (email + password)
- **Payments**: Stripe (Connected Accounts)
- **Hosting**: Vercel

## Project Structure

```
eccofood/
├── app/
│   ├── [domain]/                 # Tenant-specific routes
│   │   ├── layout.tsx            # Dynamic branding layout
│   │   ├── page.tsx              # Home page
│   │   ├── (store)/              # Customer-facing routes
│   │   │   ├── menu/
│   │   │   ├── carrito/
│   │   │   ├── checkout/
│   │   │   ├── reservas/
│   │   │   └── mis-pedidos/
│   │   └── (admin)/              # Admin routes
│   │       ├── login/
│   │       ├── dashboard/
│   │       ├── productos/
│   │       ├── pedidos/
│   │       ├── reservas/
│   │       ├── clientes/
│   │       ├── ventas/
│   │       └── configuracion/
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── register/         # Tenant registration
│   │   │   ├── login/
│   │   │   └── logout/
│   │   ├── stripe/
│   │   │   ├── connect/          # Stripe OAuth
│   │   │   ├── webhook/          # Stripe webhooks
│   │   │   ├── checkout/         # Create checkout session
│   │   │   └── invoice/
│   │   └── upload/               # Image uploads
│   │
│   ├── layout.tsx                # Root layout
│   └── globals.css
│
├── lib/
│   ├── types.ts                  # All TypeScript interfaces
│   ├── tenant.ts                 # Tenant utility functions
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server client
│   └── utils.ts
│
├── components/
│   ├── store/                    # Customer components
│   ├── admin/                    # Admin components
│   ├── layout/                   # Shared layout components
│   └── ui/                       # Shadcn/ui components
│
├── supabase/
│   └── schema.sql                # Database schema + RLS policies
│
├── middleware.ts                 # Domain detection
├── SETUP.md                      # Setup instructions
└── AGENTS.md
```

## Database Schema (Key Tables)
- **tenants**: Stores restaurant/business accounts
- **tenant_branding**: Customization (colors, fonts, logo)
- **restaurant_settings**: Delivery, reservations, hours config
- **menu_categories & menu_items**: Restaurant menu
- **orders**: Customer orders
- **reservations & tables**: Reservation system
- **customers**: Customer data
- **subscription_plans**: B2B plans configuration

## Authentication Flow
1. Restaurant owner registers via `/api/auth/register`
2. Supabase creates auth user + tenant record
3. Admin login via email/password (RLS validates ownership)
4. Customer can place orders without auth (anonymous)

## Multi-Tenancy
- **Domain detection**: middleware.ts extracts domain from request
- **RLS policies**: Ensure users only see their tenant's data
- **Dynamic branding**: Each tenant has custom colors, fonts, logo
- **Stripe Connect**: Each tenant gets own Stripe account

## Current Progress (As of April 4, 2026)
✅ Phase 1: Core Infrastructure
- [x] Next.js 16 setup
- [x] Database schema with RLS
- [x] Middleware for domain detection
- [x] Dynamic branding layout
- [x] Types defined

✅ Phase 2: Authentication & Payments
- [x] Admin login/register pages
- [x] Stripe Connected Accounts setup
- [x] Webhook handlers
- [x] Subscription management
- [x] Integrations page (Stripe status)

✅ Phase 3: Admin Panel (Partial)
- [x] Dashboard with menu links
- [x] Order management (list & detail)
- [x] Configuration pages (branding, restaurant, delivery, reservas, planes, integraciones)
- [ ] Product management
- [ ] Reservation calendar
- [ ] Dashboard & analytics

✅ Phase 4: Store Frontend
- [x] Menu display with 3 layouts
- [x] Shopping cart
- [x] Checkout flow
- [x] Order tracking
- [x] Dynamic home page with page builder

## Important Notes for Next Developer

### Architecture & Security
1. **RLS is critical**: All database policies must validate tenant ownership
2. **Domain routing**: Uses URL hostname to detect tenant, not URL params
3. **Stripe Connected**: Each restaurant has their own Stripe account
4. **No auth cookies stored**: Uses Supabase JWT in localStorage

### Design System & Theming
5. **CSS Variables are mandatory**: All colors use CSS variables from `globals.css`
   - Never hardcode colors (red-600, #FF0000, etc.)
   - Use semantic tokens: `var(--color-primary)`, `var(--color-text-primary)`
   - See `THEME_SYSTEM.md` for complete documentation
6. **Three-layer token system**:
   - **Primitive**: Brand colors (--color-eccofood-red, etc.)
   - **Semantic**: Component intent (--color-primary, --color-danger, etc.)
   - **Alias**: Domain-specific (--color-section-orders, etc.)
7. **Dynamic theming**: `lib/theme.ts` provides theme engine
   - `applyTheme()` - Switch themes at runtime
   - `mergeTenantTheme()` - Per-tenant color customization
8. **SectionColorProvider**: Automatically applies section-specific colors in admin pages
   - Wraps AdminContent in `app/[domain]/admin/layout.tsx`
   - Detects current section from URL pathname
9. **Validation**: Run `lib/theme-validation.ts` to verify:
   - All tokens defined
   - No hardcoded colors
   - Valid color values

## To Run Locally
```bash
npm run dev
```
Then access via `http://localhost:3000`

See SETUP.md for detailed setup instructions.
