# Environment Variables Security Guide

## CRITICAL: Never commit real secrets to .env.local

This project uses Supabase and Stripe. These services require secret API keys that must be protected.

---

## Local Development (.env.local)

Use **placeholder values only** for local development:

```bash
# .env.local - FOR DEVELOPMENT ONLY
SUPABASE_SERVICE_ROLE_KEY=PLACEHOLDER_VALUE
STRIPE_SECRET_KEY=sk_test_PLACEHOLDER
```

Get actual test keys from:
- **Supabase**: https://supabase.com/dashboard/project/[project]/settings/api
- **Stripe**: https://dashboard.stripe.com/test/apikeys

---

## Production (Vercel Environment Variables)

✅ **CORRECT**: Set secrets in Vercel Dashboard, NOT in code

### Step 1: Go to Vercel Dashboard

```
https://vercel.com/thesecretcam7-2634s-projects/restaurant-saas/settings/environment-variables
```

### Step 2: Add Environment Variables

Set these for **Production** environment:

| Variable | Source | Type |
|----------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API Keys | Secret |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | Secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API Keys | Public |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → Signing Secret | Secret |

### Step 3: Deploy

After setting env vars in Vercel, redeploy:

```bash
git push  # Triggers Vercel redeploy with new env vars
```

---

## Key Security Rules

✅ **DO:**
- [ ] Store secrets in Vercel Dashboard
- [ ] Use environment-specific values (test keys for dev, live keys for prod)
- [ ] Rotate keys quarterly
- [ ] Use placeholder values in .env.local
- [ ] Add pre-commit hook to prevent secrets leaking

❌ **DON'T:**
- [ ] Commit .env.local with real keys
- [ ] Share API keys in Slack/email
- [ ] Use same keys for dev and production
- [ ] Log sensitive values to console

---

## If Secrets Were Leaked

If real keys were ever committed:

1. **Immediately rotate keys:**
   - Supabase: https://supabase.com/dashboard/project/[id]/settings/api
   - Stripe: https://dashboard.stripe.com/account/apikeys

2. **Clean git history:**
   ```bash
   git-filter-repo --invert-paths --paths '.env.local'
   git push --force-with-lease
   ```

3. **Monitor for unauthorized access:**
   - Supabase: Check audit logs in dashboard
   - Stripe: Monitor charges and API activity

---

## Prevention: Git Hooks

Add pre-commit hook to prevent future leaks:

```bash
# .husky/pre-commit
#!/bin/sh
if grep -r "SUPABASE_SERVICE_ROLE_KEY\|STRIPE_SECRET_KEY\|sk_live_\|sk_test_" .env.local 2>/dev/null | grep -v "PLACEHOLDER"; then
  echo "❌ Real secrets detected in .env.local! Use placeholder values only."
  exit 1
fi
```

---

## References

- [Supabase Environment Variables](https://supabase.com/docs/guides/auth#environment-variables)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
