# Quick Start Guide - Restaurant SaaS MVP

Welcome! This guide will get you up and running with the Restaurant SaaS application in 5 minutes.

## 📋 Prerequisites

- Node.js 18+
- Git
- A Supabase account (https://supabase.com)
- A Stripe account (https://stripe.com)
- A Vercel account (https://vercel.com) for deployment

## 🚀 Local Setup (5 minutes)

### 1. Clone and Install

```bash
cd /path/to/restaurant-saas
npm install
```

### 2. Set Up Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLIC_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Optional - for transactional emails)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@localhost
```

### 3. Set Up Supabase Database

```bash
# Run migrations
npx supabase db pull  # If using Supabase CLI
```

Or manually create tables using SQL (see `supabase/schema.sql`):
- tenants
- tenant_branding
- restaurant_settings
- menu_categories
- menu_items
- orders
- reservations
- subscription_plans

### 4. Configure Stripe

1. Get test keys from https://dashboard.stripe.com/test/keys
2. Create test products/prices for subscription plans
3. Add webhook endpoint: `http://localhost:3000/api/stripe/webhook`
4. Get webhook signing secret

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## 🧪 Testing the App

### Test Account Flow

1. **Register**
   - Go to http://localhost:3000/register
   - Enter email and password
   - Create restaurant (any name)

2. **View Admin Dashboard**
   - Login at http://localhost:3000/login
   - Click on restaurant slug or use `/[slug]/admin/dashboard`
   - You'll see the admin dashboard

3. **Configure Restaurant**
   - Go to Configuración → Restaurante
   - Fill in restaurant details
   - Go to Configuración → Integraciones
   - Click "Conectar" to set up Stripe

4. **Add Products**
   - Go to Productos
   - Click "Nuevo Producto"
   - Fill in product name, price, description
   - Save

5. **View Customer Experience**
   - Go to http://localhost:3000/[your-slug]
   - You should see customizable home page
   - Click Menu to see products
   - Test the cart (won't actually charge)

### Test Stripe Integration

1. **Create Subscription**
   - Go to Configuración → Planes
   - Select a plan
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future expiry, any CVC

2. **Test Orders**
   - Go to customer storefront
   - Add item to cart
   - Proceed to checkout
   - Use test card above
   - Confirm payment

3. **View Orders**
   - Go to Pedidos in admin
   - See orders you created
   - Click to see details
   - Update status

## 📚 Project Structure

```
app/
├── api/
│   ├── auth/              # Authentication endpoints
│   ├── stripe/            # Stripe integration
│   ├── orders/            # Order CRUD
│   ├── products/          # Product management
│   ├── customers/         # Customer aggregation
│   ├── analytics/         # Sales data
│   └── tenant/            # Tenant config
├── [domain]/
│   ├── (admin)/          # Admin pages (protected)
│   │   ├── dashboard/
│   │   ├── pedidos/
│   │   ├── productos/
│   │   ├── clientes/
│   │   ├── ventas/
│   │   └── configuracion/
│   └── (store)/          # Customer-facing pages
│       ├── page.tsx      # Home page (dynamic)
│       ├── menu/
│       ├── carrito/
│       └── checkout/
lib/
├── supabase/             # Supabase client & config
├── email/                # Email templates & sending
├── types.ts              # TypeScript interfaces
└── checkPlan.ts          # Plan limit validation
```

## 🔑 Key Features Ready to Use

### Admin Features ✅
- [x] Dashboard with KPIs
- [x] Order management (list, detail, status update)
- [x] Product management (CRUD)
- [x] Customer management
- [x] Sales analytics
- [x] Configuration (branding, restaurant, delivery, reservations, plans, integrations)
- [x] Stripe Connect setup

### Customer Features ✅
- [x] Dynamic home page with page builder
- [x] Menu with multiple layouts
- [x] Shopping cart
- [x] Stripe checkout
- [x] Order confirmation

### Stripe Integration ✅
- [x] Express Accounts for restaurant owners
- [x] Payment processing
- [x] Subscription management
- [x] Webhook handling

## 🛠️ Next Development Tasks

### High Priority
1. **Email Notifications**
   - Set up Resend account
   - Add RESEND_API_KEY to env
   - Call email functions on order events

2. **Reservation System**
   - Create reservation booking interface
   - Add calendar view in admin
   - Email confirmations

3. **Better Product Images**
   - Implement image upload (Supabase Storage)
   - Image cropping/optimization

### Medium Priority
1. **Advanced Analytics**
   - Revenue by product category
   - Customer retention metrics
   - Forecast graphs

2. **Multi-admin Support**
   - Add team members
   - Role-based permissions

3. **Inventory Management**
   - Stock tracking
   - Low inventory alerts
   - Stock updates by order

### Lower Priority
1. **Discount Codes**
   - Create codes
   - Apply to orders
   - Track usage

2. **Customer Ratings & Reviews**
   - Rate orders
   - Display ratings
   - Filter by rating

3. **Mobile Admin App**
   - React Native version
   - Take orders on mobile
   - Real-time notifications

## 🚢 Deploy to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Restaurant SaaS MVP"
git push origin main
```

### 2. Connect to Vercel
- Go to https://vercel.com
- Click "New Project"
- Select your GitHub repository
- Click Import

### 3. Add Environment Variables
In Vercel dashboard:
- Go to Settings → Environment Variables
- Add all variables from `.env.local`

### 4. Deploy
- Click Deploy
- Wait for build to complete
- Visit your live site!

## 📊 Monitoring

### View Logs
```bash
# Local
npm run dev  # View server logs in terminal

# Production (Vercel)
# Go to Vercel dashboard → Select project → View function logs
```

### Check Stripe Events
- https://dashboard.stripe.com/test/events
- Filter by webhook events
- Verify successful webhook processing

### Monitor Database
- https://app.supabase.com
- Select your project
- View SQL Editor for queries
- Check real-time data

## 🐛 Common Issues

### "Tenant not found"
- Make sure you logged in with email matching your tenant
- Check that tenant slug matches URL

### Stripe webhook not working
- Verify webhook secret in `.env.local`
- Check webhook endpoint URL in Stripe dashboard
- Look at Stripe event delivery logs

### Orders not appearing
- Make sure you're logged into correct tenant
- Verify domain parameter in API calls
- Check browser console for errors

### Page builder not saving
- Verify tenant has page_config field in branding table
- Check network tab for 404/500 errors
- Look at server logs

## 📞 Support

For detailed documentation:
- Database schema: `supabase/schema.sql`
- Email setup: `EMAIL_SETUP.md`
- Implementation status: `IMPLEMENTATION_STATUS.md`
- Architecture: `CLAUDE.md`

For quick answers:
- Check function comments in code
- Look at existing API endpoints for patterns
- Test in browser console with fetch()

## ✅ You're Ready!

Now you can:
1. Create test restaurants
2. Add products
3. Process orders
4. View analytics
5. Customize storefront

Happy building! 🚀
