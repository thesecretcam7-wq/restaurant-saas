# Setup Guide - Restaurant SaaS

## 1. Supabase Project Setup

### Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Select your region (recommended: us-east-1 or your nearest region)
3. Create a strong password for your database
4. Wait for the project to be created

### Import Schema
1. Go to SQL Editor in your Supabase dashboard
2. Create a new SQL query
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL Editor and execute
5. Wait for all tables and policies to be created

### Get Your Credentials
1. Go to **Settings > API** in Supabase
2. Copy the following values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Stripe Setup

### Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete your account setup

### Get Your Credentials
1. Go to **Developers > API Keys**
2. Copy:
   - `Publishable key` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` → `STRIPE_SECRET_KEY`

### Setup Webhook Signing Secret
1. Go to **Developers > Webhooks**
2. Create a new endpoint for: `YOUR_DOMAIN/api/stripe/webhook`
3. Select these events:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `account.updated`
4. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

## 3. Environment Variables

### Create `.env.local`
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 4. Local Development

### Install Dependencies (if not done)
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 5. Supabase Auth Setup

### Enable Email Auth
1. Go to **Authentication > Providers** in Supabase
2. Make sure "Email" provider is enabled
3. Go to **Authentication > Templates**
4. Configure email templates if needed (optional)

## 6. Testing

### Create a Test Tenant
1. Navigate to `http://localhost:3000/api/auth/register`
2. Fill in the registration form with test data
3. Verify the tenant was created in Supabase

### Test Multi-Tenancy
1. After creating a tenant, you should get a domain (e.g., `test-restaurant.localhost:3000`)
2. Add this to your hosts file or use `*.localhost` (which works by default)

## 7. Deployment to Vercel

### Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPO
git push -u origin main
```

### Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. In Environment Variables, add all your `.env.local` values
3. Deploy!

### Configure Custom Domains
For production, each restaurant will use their own domain via CNAME:
1. User adds their domain (e.g., `pizzeria-juan.com`)
2. User adds CNAME record pointing to Vercel
3. Middleware detects domain and routes to correct tenant

## 8. Next Steps

1. **Create Admin Register/Login Pages**: `/app/[domain]/(admin)/login`
2. **Create Admin Dashboard**: `/app/[domain]/(admin)/dashboard`
3. **Create Store Menu Page**: `/app/[domain]/(store)/menu`
4. **Setup Stripe Connect onboarding**: `/api/stripe/connect`
5. **Create Subscription Plans**: Add to `subscription_plans` table

## Troubleshooting

### RLS Errors
- Make sure RLS policies are enabled on all tables
- Test with a logged-in user who is the tenant owner

### Domain Detection Issues
- Check middleware.ts for hostname detection
- In development, use `localhost` or `[domain].localhost`
- For local testing: `127.0.0.1` won't work with subdomains

### Stripe Webhook Issues
- Make sure webhook URL is publicly accessible
- Test webhooks in Stripe Dashboard > Developers > Webhooks
- Check request logs for debugging
