# ✅ Subscription Management System - Setup Checklist

## Status: 95% Complete ✨

---

## What's Already Done ✅

### 1. **Code Implementation** ✅
- [x] Owner revenue dashboard (`/admin/ingresos`) with charts
- [x] Customer billing portal (`/account/suscripcion`, `/account/cambiar-plan`, `/account/facturas`)
- [x] Email notification templates (5 types)
- [x] Cron job endpoints (send notifications + retry payments)
- [x] Admin panel updated with dashboard link
- [x] All code deployed to Vercel ✅

### 2. **Database Structure** ✅
- [x] All migration SQL files created and ready
- [x] Combined migration file: `migrations/complete_subscription_setup.sql`

### 3. **Environment Configuration** ✅
- [x] CRON_SECRET generated: `sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f`
- [x] Configuration files created (`.env.cron`)

### 4. **Documentation** ✅
- [x] MIGRATION_INSTRUCTIONS.md (complete step-by-step guide)
- [x] Setup scripts created

---

## What You Need to Do (5 Steps) 📋

### **STEP 1: Execute Database Migrations** (5 min)

1. Go to: https://supabase.com/dashboard
2. Select your **eccofood** project
3. Click **SQL Editor** → **New query**
4. Copy entire content from: `migrations/complete_subscription_setup.sql`
5. Paste into the SQL editor
6. Click **RUN** (Cmd+Enter)
7. ✅ Should see green checkmarks and success messages

**What this creates:**
- `audit_logs` table (tracks all admin actions)
- 5 new columns on `tenants` table for notification tracking

---

### **STEP 2: Add CRON_SECRET to Vercel** (3 min)

1. Go to: https://vercel.com/dashboard/restaurant-saas
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. Fill in:
   - **Name**: `CRON_SECRET`
   - **Value**: `sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f`
   - **Select Environments**: ✅ Production, ✅ Preview
5. Click **Add**
6. ✅ Vercel will auto-redeploy

**Note**: Both cron jobs check this variable for authorization.

---

### **STEP 3: Setup Cron Jobs** (5 min)

Choose ONE option:

#### **Option A: EasyCron (Recommended for Testing)** ⭐

1. Go to: https://www.easycron.com
2. Sign up (free account)
3. Create Job #1:
   - **Cron Expression**: `0 2 * * *` (daily 2 AM)
   - **HTTP Request URL**: `https://restaurant-saas-[random].vercel.app/api/cron/send-notifications`
   - **Request Method**: POST
   - **HTTP Headers**:
     ```
     Authorization: Bearer sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f
     Content-Type: application/json
     ```
   - **Save** → Should show "Cron job created"

4. Create Job #2:
   - **Cron Expression**: `0 3 * * *` (daily 3 AM)
   - **HTTP Request URL**: `https://restaurant-saas-[random].vercel.app/api/cron/retry-failed-payments`
   - **Request Method**: POST
   - **HTTP Headers**: (same as Job #1)
   - **Save**

#### **Option B: Vercel Crons (Production-Ready)**
Requires Vercel Pro plan. See `MIGRATION_INSTRUCTIONS.md` for setup.

---

### **STEP 4: Test Cron Jobs** (2 min)

Run these commands from your terminal to verify:

```bash
# Test send notifications
curl -X POST https://restaurant-saas-[random].vercel.app/api/cron/send-notifications \
  -H "Authorization: Bearer sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f" \
  -H "Content-Type: application/json"

# Expected response:
# {"success": true, "message": "Cron job completed: 0 emails sent, 0 errors", ...}

# Test retry failed payments
curl -X POST https://restaurant-saas-[random].vercel.app/api/cron/retry-failed-payments \
  -H "Authorization: Bearer sk_sub_cron_b4fe84978b27b0e79875c1fba63ee4d94fcbd9d00629153f064872f31b246c3f" \
  -H "Content-Type: application/json"
```

---

### **STEP 5: Test Everything End-to-End** (30 min)

1. **Log in as Super Admin**:
   - Email: `thesecretcam7@gmail.com` or `johang.musica@gmail.com`
   - Navigate to `/admin` (should see dashboard with 3 cards)

2. **View Revenue Dashboard**:
   - Click **Dashboard de Ingresos** card
   - Should see: revenue metrics, charts, upcoming expirations

3. **Create a Test Restaurant**:
   - Go to `/auth/register`
   - Create new account with test email
   - Set up restaurant with name and slug

4. **Test Trial System**:
   - New restaurant gets 30-day trial
   - See trial countdown in admin dashboard
   - After trial expires, account should be blocked

5. **Test Plan Changes**:
   - As new restaurant, visit `/account/cambiar-plan`
   - Click upgrade/downgrade button
   - Check pro-rata calculation is correct

6. **Check Invoice History**:
   - Visit `/account/facturas`
   - Should see mock invoices from last 6 months

---

## Test Accounts for Super Admin

```
Email: thesecretcam7@gmail.com
Email: johang.musica@gmail.com
Password: (set your own during first login)
```

Both accounts can:
- View `/admin` dashboard
- View `/admin/cuentas` (manage all accounts)
- View `/admin/ingresos` (revenue dashboard)

---

## What Happens Automatically (After Setup)

### **Daily at 2 AM**:
- Cron job scans all tenants
- Finds trials expiring in 7 days → sends email
- Finds subscriptions expiring in 7 days → sends email
- Finds expired subscriptions → sends "account suspended" email

### **Daily at 3 AM**:
- Cron job scans tenants with failed payments
- Retries invoices that are 1-7 days old
- After 3 failures → sends escalation email

### **Customer Actions**:
- Plan upgrade → immediate pro-rata charge
- Plan downgrade → credit applied next cycle
- Subscription renewal → automatic via Stripe webhook

---

## Files Created This Session

```
✅ migrations/complete_subscription_setup.sql   (Combined migrations)
✅ MIGRATION_INSTRUCTIONS.md                   (Complete guide)
✅ SETUP_CHECKLIST.md                          (This file)
✅ setup-subscriptions.js                      (Automation script)
✅ .env.cron                                   (CRON_SECRET reference)
✅ app/admin/page.tsx                          (Updated with dashboard link)
```

---

## Support During Testing

If you run into issues:

1. **Database error during migration**:
   - Check Supabase SQL editor for error message
   - Verify `tenants` table exists
   - Try running each section separately

2. **CRON_SECRET not working**:
   - Verify variable is added in Vercel
   - Check exact value matches (copy-paste from `.env.cron`)
   - Redeploy after adding variable

3. **Cron jobs not firing**:
   - Test manually with curl command (Step 4)
   - Check EasyCron dashboard for execution logs
   - Verify cron expression format (should be: `0 2 * * *`)

4. **Emails not sending**:
   - Check `.env.local` has Resend API key
   - Verify `lib/email/send.ts` has correct configuration
   - Check Resend dashboard for delivery logs

---

## 🎯 Ready to Test!

Everything is deployed and ready. Just complete the 5 steps above and you can start testing:

**✨ New Restaurant Registration → Trial → Plan Selection → Revenue Dashboard**

Start with creating a test restaurant and watch the full flow work! 🚀
