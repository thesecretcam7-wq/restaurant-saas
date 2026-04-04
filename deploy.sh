#!/bin/bash

# Restaurant SaaS - Deployment Script
# This script automates the deployment to Vercel and setup

set -e

echo "🚀 Restaurant SaaS Deployment Helper"
echo "======================================"
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "❌ Not a git repository"
    echo "Please initialize git first:"
    echo "  git init"
    echo "  git add ."
    echo "  git commit -m 'Initial commit'"
    exit 1
fi

# Check if we have uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "📝 You have uncommitted changes. Commit them first:"
    echo "  git add ."
    echo "  git commit -m 'Your message'"
    exit 1
fi

echo "✅ Git repository ready"
echo ""

# Get current branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "📍 Current branch: $BRANCH"
echo ""

echo "📋 Next steps:"
echo ""
echo "1. Push to GitHub:"
echo "   git remote add origin https://github.com/yourusername/your-repo.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "2. Go to https://vercel.com/new"
echo "   - Click 'Import Project'"
echo "   - Select your GitHub repository"
echo "   - Click 'Import'"
echo ""
echo "3. Add Environment Variables in Vercel:"
echo "   Settings → Environment Variables"
echo ""
echo "   Required:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - STRIPE_PUBLIC_KEY"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - NEXT_PUBLIC_APP_URL (your vercel domain)"
echo ""
echo "   Optional (for emails):"
echo "   - RESEND_API_KEY"
echo "   - RESEND_FROM_EMAIL"
echo ""
echo "4. Click 'Deploy'"
echo ""
echo "5. Update Stripe webhook:"
echo "   https://dashboard.stripe.com/webhooks"
echo "   - Endpoint URL: https://your-vercel-app.vercel.app/api/stripe/webhook"
echo "   - Get signing secret and add to STRIPE_WEBHOOK_SECRET"
echo ""
echo "✨ Done! Your app will be live in 1-2 minutes."
echo ""
