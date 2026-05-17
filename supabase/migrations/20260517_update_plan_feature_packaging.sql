UPDATE subscription_plans
SET features = '{
  "max_products": 100,
  "orders_per_month": 1000,
  "categories": 10,
  "support": "email",
  "qr_menu": true,
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
}'::jsonb
WHERE name = 'basic';

UPDATE subscription_plans
SET features = '{
  "max_products": 500,
  "orders_per_month": "unlimited",
  "categories": 50,
  "support": "priority_email",
  "qr_menu": true,
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
}'::jsonb
WHERE name = 'pro';

UPDATE subscription_plans
SET features = '{
  "max_products": "unlimited",
  "orders_per_month": "unlimited",
  "categories": "unlimited",
  "support": "24/7_phone",
  "qr_menu": true,
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
}'::jsonb
WHERE name = 'premium';
