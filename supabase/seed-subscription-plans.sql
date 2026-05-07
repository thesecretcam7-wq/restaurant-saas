-- Seed subscription plans with Stripe product/price IDs
-- Stripe account: acct_1T6r4RKGPSBhX7gV

INSERT INTO subscription_plans (name, monthly_price, features, stripe_product_id, stripe_price_id)
VALUES
  (
    'basic',
    39.00,
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
    'price_1TUCwTKGPSBhX7gVWgeifpg3'
  ),
  (
    'pro',
    99.00,
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
    'price_1TUCxKKGPSBhX7gVTF0uuB2L'
  ),
  (
    'premium',
    299.00,
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
    'price_1TUCxOKGPSBhX7gV2Wq3teeZ'
  )
ON CONFLICT (name) DO UPDATE
SET
  monthly_price = EXCLUDED.monthly_price,
  features = EXCLUDED.features,
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id;
