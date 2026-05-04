# Subscription Management System Setup

## Step 1: Execute Database Migrations in Supabase

1. Go to https://supabase.com/dashboard → Select your project → SQL Editor
2. Click "New query" and paste the entire content of: `migrations/complete_subscription_setup.sql`
3. Click "Run" (or Cmd+Enter)
4. Verify: You should see "Audit logs table created" and "Notification columns added" messages

This creates:
- `audit_logs` table for tracking admin actions
- Notification columns on `tenants` table:
  - `last_notification_sent_at`
  - `trial_expiration_notified`
  - `subscription_expiration_notified`
  - `payment_failure_count`
  - `last_payment_failure_at`

---

## Step 2: Configure CRON_SECRET in Vercel

The CRON_SECRET is a secret token that authorizes cron job requests.

1. Go to https://vercel.com/dashboard
2. Select project: **restaurant-saas**
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `CRON_SECRET`
   - **Value**: `(generate a random string like)` `sk_sub_cron_prod_1234567890abcdef`
   - Click "Add"

This variable is already being checked in:
- `/api/cron/send-notifications/route.ts`
- `/api/cron/retry-failed-payments/route.ts`

---

## Step 3: Configure Cron Jobs

The cron endpoints are ready at:
- **Notifications**: `https://your-app.vercel.app/api/cron/send-notifications` (POST)
- **Payment Retries**: `https://your-app.vercel.app/api/cron/retry-failed-payments` (POST)

Both require header: `Authorization: Bearer {CRON_SECRET}`

### Option A: Use EasyCron (Free, Recommended for Testing)

1. Go to https://www.easycron.com/
2. Sign up or login
3. Create two cron jobs:

**Job 1: Send Notifications**
- Cron expression: `0 2 * * *` (2 AM daily)
- URL: `https://your-app-domain.vercel.app/api/cron/send-notifications`
- Request method: POST
- Custom HTTP headers:
  ```
  Authorization: Bearer sk_sub_cron_prod_1234567890abcdef
  Content-Type: application/json
  ```

**Job 2: Retry Failed Payments**
- Cron expression: `0 3 * * *` (3 AM daily)
- URL: `https://your-app-domain.vercel.app/api/cron/retry-failed-payments`
- Request method: POST
- Custom HTTP headers:
  ```
  Authorization: Bearer sk_sub_cron_prod_1234567890abcdef
  Content-Type: application/json
  ```

### Option B: Use Vercel Crons (Production, Requires Pro Plan)

If using Vercel Crons, create `/api/cron/send-notifications.ts` and `/api/cron/retry-failed-payments.ts` files with `@vercel/cron` integration.

---

## Testing Cron Jobs Manually

Test each endpoint from terminal:

```bash
curl -X POST https://your-app.vercel.app/api/cron/send-notifications \
  -H "Authorization: Bearer sk_sub_cron_prod_1234567890abcdef" \
  -H "Content-Type: application/json"

curl -X POST https://your-app.vercel.app/api/cron/retry-failed-payments \
  -H "Authorization: Bearer sk_sub_cron_prod_1234567890abcdef" \
  -H "Content-Type: application/json"
```

Expected response:
```json
{
  "success": true,
  "message": "Cron job completed: X sent, Y errors",
  "sentCount": X,
  "errorCount": Y
}
```

---

## Verification

After setup, you can verify everything is working:

1. **Dashboard accessible**: Log in with super admin email and visit `/admin/ingresos`
2. **Customer portal**: New restaurants can access `/account/suscripcion` and `/account/cambiar-plan`
3. **Cron jobs**: Run test curl commands above
4. **Database**: Check Supabase for new tables and columns

---

## What Happens Now

### For Trial Customers
- Day 1-23: Normal access, trial banner shows countdown
- Day 24: Orange warning badge shows trial expires in 7 days
- Day 24: Email sent: "Your trial expires in 7 days - choose a plan"
- Day 28: Red warning badge
- Day 30: Account suspended, access blocked

### For Paid Subscriptions
- Day 1-23: Active subscription, green checkmark
- Day 24: Email sent: "Your subscription renews in 7 days"
- Day 30: Stripe charges automatically (requires valid payment method)
- If payment fails: Retry job attempts to charge again next day
- After 3 failures: Escalation email sent

### For Plan Changes
- Customer upgrades: Pro-rata charge calculated and invoiced
- Customer downgrades: Credit applied to next billing cycle
- Confirmation email sent immediately
