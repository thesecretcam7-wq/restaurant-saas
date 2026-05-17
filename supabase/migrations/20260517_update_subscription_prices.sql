-- Seed subscription plans with Stripe product/price IDs
-- Stripe account: acct_1T6r4RKGPSBhX7gV

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS annual_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS stripe_annual_price_id text;

INSERT INTO subscription_plans (name, monthly_price, annual_price, features, stripe_product_id, stripe_price_id, stripe_annual_price_id)
VALUES
  (
    'basic',
    49.99,
    539.89,
    '{
      "max_products": 100,
      "orders_per_month": 1000,
      "categories": 10,
      "support": "email",
      "pos": true,
      "comandero": true,
      "kds": true,
      "website": false,
      "kiosk": false,
      "reservations": false,
      "delivery": false,
      "analytics": false,
      "custom_domain": false,
      "multiple_locations": false,
      "exclusive_design": false
    }'::jsonb,
    'prod_UT9DtvBo3Sx1MM',
    'price_1TY4Y9KGPSBhX7gVeMzikJZJ',
    'price_1TY4YAKGPSBhX7gV9XM4sVis'
  ),
  (
    'pro',
    99.99,
    1079.89,
    '{
      "max_products": 500,
      "orders_per_month": "unlimited",
      "categories": 50,
      "support": "priority_email",
      "pos": true,
      "comandero": true,
      "kds": true,
      "website": true,
      "kiosk": true,
      "reservations": true,
      "delivery": true,
      "analytics": true,
      "custom_domain": false,
      "multiple_locations": false,
      "exclusive_design": false
    }'::jsonb,
    'prod_UT9ECe449iGLoC',
    'price_1TY4YBKGPSBhX7gV3t1zyz1m',
    'price_1TY4YCKGPSBhX7gVInptkVgC'
  ),
  (
    'premium',
    299.99,
    3239.89,
    '{
      "max_products": "unlimited",
      "orders_per_month": "unlimited",
      "categories": "unlimited",
      "support": "24/7_phone",
      "pos": true,
      "comandero": true,
      "kds": true,
      "website": true,
      "kiosk": true,
      "reservations": true,
      "delivery": true,
      "analytics": true,
      "custom_domain": true,
      "multiple_locations": true,
      "api_access": true,
      "dedicated_support": true,
      "exclusive_design": true
    }'::jsonb,
    'prod_UT9E4ORktOFZ26',
    'price_1TY4YDKGPSBhX7gV2mT9dmKO',
    'price_1TY4YFKGPSBhX7gVXCX5nt5C'
  )
ON CONFLICT (name) DO UPDATE
SET
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  features = EXCLUDED.features,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id,
  stripe_annual_price_id = EXCLUDED.stripe_annual_price_id;
