-- Seed subscription plans with Stripe product/price IDs
-- Stripe account: acct_1T6r4RKGPSBhX7gV

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS annual_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id text;

INSERT INTO subscription_plans (name, monthly_price, annual_price, features, stripe_product_id, stripe_price_id, stripe_annual_price_id)
VALUES
  (
    'basic',
    39.00,
    421.20,
    '{
      "max_products": 100,
      "orders_per_month": 1000,
      "categories": 10,
      "support": "email",
      "delivery": true,
      "reservations": true,
      "custom_domain": false
    }'::jsonb,
    'prod_UT9DtvBo3Sx1MM',
    'price_1TUCwTKGPSBhX7gVWgeifpg3',
    'price_1TUxzdKGPSBhX7gVoCrI4jPn'
  ),
  (
    'pro',
    99.00,
    1069.20,
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
    'prod_UT9ECe449iGLoC',
    'price_1TUCxKKGPSBhX7gVTF0uuB2L',
    'price_1TUxzgKGPSBhX7gViCozAc2H'
  ),
  (
    'premium',
    299.00,
    3229.20,
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
    'prod_UT9E4ORktOFZ26',
    'price_1TUCxOKGPSBhX7gV2Wq3teeZ',
    'price_1TUxzjKGPSBhX7gVJht9mcRF'
  )
ON CONFLICT (name) DO UPDATE
SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  features = EXCLUDED.features,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_annual_price_id = EXCLUDED.stripe_annual_price_id;
