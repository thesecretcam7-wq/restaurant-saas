# Restaurant SaaS - Development Notes

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
restaurant-saas/
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

## Current Progress (As of April 2, 2026)
✅ Phase 1: Core Infrastructure
- [x] Next.js 16 setup
- [x] Database schema with RLS
- [x] Middleware for domain detection
- [x] Dynamic branding layout
- [x] Types defined

🔄 Phase 2: Authentication & Payments
- [ ] Admin login/register pages
- [ ] Stripe Connected Accounts setup
- [ ] Webhook handlers
- [ ] Subscription management

⏳ Phase 3: Admin Panel
- [ ] Product management
- [ ] Order management
- [ ] Reservation calendar
- [ ] Dashboard & analytics

⏳ Phase 4: Store Frontend
- [ ] Menu display
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] Order tracking

## Important Notes for Next Developer
1. **RLS is critical**: All database policies must validate tenant ownership
2. **Domain routing**: Uses URL hostname to detect tenant, not URL params
3. **Stripe Connected**: Each restaurant has their own Stripe account
4. **No auth cookies stored**: Uses Supabase JWT in localStorage
5. **Dynamic styling**: Uses CSS variables for per-tenant theming

## To Run Locally
```bash
npm run dev
```
Then access via `http://localhost:3000`

See SETUP.md for detailed setup instructions.
