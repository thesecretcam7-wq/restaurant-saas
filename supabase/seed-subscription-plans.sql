-- Seed subscription plans with Stripe product/price IDs
-- These IDs should be replaced with actual Stripe product and price IDs

INSERT INTO subscription_plans (name, monthly_price, features, stripe_product_id, stripe_price_id)
VALUES
  (
    'basic',
    29.99,
    '{
      "max_products": 100,
      "orders_per_month": 1000,
      "categories": 10,
      "support": "email",
      "delivery": true,
      "reservations": true,
      "custom_domain": false
    }'::jsonb,
    'prod_basic',
    'price_basic'
  ),
  (
    'pro',
    79.99,
    '{
      "max_products": 500,
      "orders_per_month": 10000,
      "categories": 50,
      "support": "priority_email",
      "delivery": true,
      "reservations": true,
      "custom_domain": true,
      "analytics": true
    }'::jsonb,
    'prod_pro',
    'price_pro'
  ),
  (
    'premium',
    199.99,
    '{
      "max_products": "unlimited",
      "orders_per_month": "unlimited",
      "categories": "unlimited",
      "support": "24/7_phone",
      "delivery": true,
      "reservations": true,
      "custom_domain": true,
      "analytics": true,
      "api_access": true,
      "dedicated_support": true
    }'::jsonb,
    'prod_premium',
    'price_premium'
  )
ON CONFLICT (name) DO UPDATE
SET
  monthly_price = EXCLUDED.monthly_price,
  features = EXCLUDED.features;
