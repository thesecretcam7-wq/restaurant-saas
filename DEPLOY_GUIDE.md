# Complete Deployment Guide

This guide walks you through deploying your Restaurant SaaS app to production. **Total time: ~30 minutes.**

## Prerequisites

- [ ] GitHub account (https://github.com)
- [ ] Vercel account (https://vercel.com)
- [ ] Supabase project created
- [ ] Stripe account with test keys
- [ ] All environment variables ready (see `.env.example`)

---

## Step 1: Prepare Your Local Code (5 minutes)

### 1.1 Final Local Testing

```bash
# Make sure everything works locally
npm run dev

# Test in browser at http://localhost:3000
# - Try registering
# - Add products
# - View admin pages
```

### 1.2 Commit Your Code

```bash
# Ensure git is initialized
git status

# Stage all changes
git add .

# Commit with meaningful message
git commit -m "feat: Complete Restaurant SaaS MVP with orders, products, customers, analytics, and reservations"

# Create main branch if needed
git branch -M main
```

### 1.3 Create GitHub Repository

**Option A: Using GitHub Web**
1. Go to https://github.com/new
2. Repository name: `restaurant-saas` (or your preference)
3. Click "Create repository"
4. Follow the instructions to push existing code

**Option B: Using GitHub CLI**
```bash
# Install GitHub CLI if needed
# brew install gh  (macOS)
# choco install gh  (Windows)
# apt-get install gh  (Linux)

# Create repo and push
gh repo create restaurant-saas --public --source=. --remote=origin --push
```

### 1.4 Push to GitHub

```bash
# Add remote if not already added
git remote add origin https://github.com/yourusername/restaurant-saas.git

# Push to GitHub
git push -u origin main

# Verify on GitHub
# https://github.com/yourusername/restaurant-saas
```

---

## Step 2: Deploy to Vercel (5 minutes)

### 2.1 Go to Vercel

1. Open https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Click "Import Git Repository"
4. Authorize Vercel with GitHub
5. Select your `restaurant-saas` repository
6. Click "Import"

### 2.2 Configure Environment Variables

In the Vercel import screen:

**Add these variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# App
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
```

**To find these values:**

**Supabase:**
1. Go to https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy `URL` and `anon key`
5. Also copy `Service Role Key` (keep this secret!)

**Stripe:**
1. Go to https://dashboard.stripe.com/test/keys
2. Copy `Publishable key` (pk_test_...)
3. Copy `Secret key` (sk_test_...)
4. For webhook secret: We'll get this in Step 3

### 2.3 Deploy

1. Click "Deploy"
2. Wait 2-3 minutes for build to complete
3. You should see "Congratulations! Your project has been successfully deployed"
4. Click "Visit" or go to https://your-vercel-app.vercel.app

### 2.4 Verify Deployment

```bash
# Test the deployment
curl https://your-vercel-app.vercel.app

# Should return HTML (not an error)
```

---

## Step 3: Configure Stripe Webhooks (5 minutes)

### 3.1 Get Your Webhook URL

Your Vercel app URL + webhook path:
```
https://your-vercel-app.vercel.app/api/stripe/webhook
```

### 3.2 Add Webhook to Stripe

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Paste your webhook URL
4. Select events:
   - `checkout.session.completed`
   - `account.updated`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Click "Add endpoint"
6. Copy the signing secret (whsec_...)

### 3.3 Update Vercel Environment Variable

1. Go to Vercel dashboard → Settings → Environment Variables
2. Edit or add `STRIPE_WEBHOOK_SECRET`
3. Paste the secret you got from Stripe
4. Click "Save"
5. Redeploy:
   ```bash
   git commit --allow-empty -m "chore: Update Stripe webhook secret"
   git push
   ```

### 3.4 Test Webhook

Stripe will send a test event. Check:
1. Stripe Dashboard → Webhooks → Your endpoint → Logs
2. Should see `test.charge.succeeded`
3. Look for `200` responses

---

## Step 4: Configure Emails (Optional - 10 minutes)

### 4.1 Choose Email Service

**Recommended: Resend**

1. Go to https://resend.com
2. Create account
3. Copy API key from dashboard
4. (Optional) Add custom domain for better deliverability

**Alternative: SendGrid**
- Go to https://sendgrid.com
- Create free account
- Get API key and sender email

### 4.2 Add to Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Add `RESEND_API_KEY=re_...`
3. Add `RESEND_FROM_EMAIL=noreply@your-domain.com`
4. Save and wait for redeploy

### 4.3 Test Email Sending

```bash
# Create a test email endpoint
# POST /api/email/test
# Body: { "email": "your@email.com" }

curl -X POST https://your-vercel-app.vercel.app/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'

# Check your inbox for test email
```

---

## Step 5: Custom Domain (Optional - 10 minutes)

### 5.1 Buy Domain

Get a domain from:
- Vercel Domains (easiest)
- Namecheap
- Google Domains
- GoDaddy

### 5.2 Connect to Vercel

**If using Vercel Domains:**
1. Vercel Dashboard → Project Settings → Domains
2. Click "Add Domain"
3. Search for domain
4. Follow purchase flow

**If using external registrar:**
1. Get Vercel nameservers:
   - Vercel Dashboard → Project Settings → Domains
   - "Add Domain" → See nameservers
2. Update nameservers at your registrar:
   - Log in to registrar
   - Find DNS settings
   - Change nameservers to Vercel's
3. Wait 24-48 hours for DNS propagation

### 5.3 Verify Domain

```bash
# After DNS propagates, test:
curl https://your-domain.com
```

---

## Step 6: Final Testing (5 minutes)

### 6.1 Test Complete Flow

1. **Registration:**
   - Go to https://your-vercel-app.vercel.app/register
   - Register with test restaurant
   - Should create account

2. **Admin Dashboard:**
   - Login at /login
   - Should see dashboard
   - Verify all pages load

3. **Products:**
   - Add 2-3 test products
   - Verify they save

4. **Customers:**
   - Should be empty initially
   - Will populate with orders

5. **Checkout:**
   - Visit storefront
   - Add to cart
   - Go to checkout
   - Use Stripe test card: `4242 4242 4242 4242`
   - Any future date, any CVC
   - Complete payment
   - Check admin → Orders

6. **Emails** (if configured):
   - Check inbox for order confirmation
   - May be in spam folder

### 6.2 Check Vercel Logs

```bash
# In Vercel dashboard:
# Functions → Your function name → Logs
# Should show requests (not errors)
```

### 6.3 Check Stripe Events

```bash
# In Stripe dashboard:
# Events → Should see:
# - checkout.session.completed
# - And other events
```

---

## Step 7: Launch Configuration (Optional)

### 7.1 Add Production Stripe Keys (When Ready)

When you're ready for real transactions:

1. Get live Stripe keys from https://dashboard.stripe.com/apikeys
2. Update Vercel environment variables with live keys
3. Update webhook endpoint with new secret
4. Test with small real transaction
5. Monitor closely for the first day

### 7.2 Set Up Monitoring

```bash
# Enable Vercel Analytics
# Dashboard → Settings → Analytics
# Already included with your deployment

# Add custom monitoring
# We recommend: Sentry.io for error tracking
```

### 7.3 Backup Database

```bash
# Supabase automatically backs up
# But create manual backup:
# Supabase Dashboard → Project Settings → Backups
# Click "Create backup"
```

---

## Step 8: Launch! 🚀

### 8.1 Tell the World

- Share link: https://your-vercel-app.vercel.app
- Invite beta users
- Monitor for issues

### 8.2 Monitor First 24 Hours

- Check Vercel dashboard every hour
- Monitor error rates
- Look for unusual patterns
- Check email deliverability

### 8.3 First Week

- Gather user feedback
- Fix any bugs
- Optimize performance
- Plan improvements

---

## Troubleshooting

### Build Fails
```
Check error log in Vercel
Common causes:
- Wrong environment variables
- Missing dependencies
- TypeScript errors
```

**Fix:**
```bash
# Locally:
npm run build
# Should show any errors
```

### Stripe Webhook Fails
```
Check Stripe Dashboard → Webhooks → Your endpoint → Logs
Common causes:
- Wrong webhook URL
- Missing webhook secret in env
- Function timeout (40s limit)
```

**Fix:**
```bash
# Check webhook secret is in Vercel
# Verify URL is correct
# Check function logs for errors
```

### Email Not Sending
```
Common causes:
- Missing API key
- Wrong email address
- Spam filter blocked it
```

**Fix:**
```bash
# Verify API key in env variables
# Check spam/promotions folder
# Test with Resend dashboard
```

### Stripe Not Processing
```
Common causes:
- Test mode vs Live mode
- Keys not matching
- CORS issues
```

**Fix:**
```bash
# Make sure using test keys (pk_test_)
# Verify keys in env match Stripe account
```

---

## Monitoring Checklist

After deployment, check:

- [ ] Vercel dashboard - no errors
- [ ] Stripe dashboard - webhooks received
- [ ] Supabase - data appearing
- [ ] Email service - sending (if configured)
- [ ] Custom domain - resolving (if added)
- [ ] SSL certificate - active (automatic)
- [ ] Backups - running (automatic)

---

## Post-Launch Maintenance

### Daily
- Check error logs
- Monitor webhook deliveries
- Review new users

### Weekly
- Check performance metrics
- Review user feedback
- Test critical flows
- Verify backups

### Monthly
- Security audit
- Performance optimization
- Dependency updates
- Feature planning

---

## Support & Help

**If something breaks:**

1. Check Vercel logs
2. Check Stripe event logs
3. Check Supabase metrics
4. Look for error patterns
5. Check browser console
6. Review function logs

**Resources:**
- Vercel Docs: https://vercel.com/docs
- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

---

## Congratulations! 🎉

Your Restaurant SaaS platform is now live and production-ready!

**You can now:**
- Register restaurants
- Manage menus and orders
- Process payments
- Track analytics
- Manage reservations (if enabled)
- Send emails (if configured)

**Next steps:**
1. Test with real users
2. Gather feedback
3. Plan improvements
4. Scale as needed

**Happy launching!**
