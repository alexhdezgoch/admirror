-- Migration: Usage-based billing
-- Replace per-brand subscriptions with single-subscription usage-based model
-- ($50/brand + $30/competitor, no free tier)

-- 1. Add quantity tracking columns to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS brand_quantity INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS competitor_quantity INTEGER DEFAULT 0;

-- 2. Drop competitor_limit from subscriptions (no longer needed)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS competitor_limit;

-- 3. Drop brand_subscriptions table entirely
DROP TABLE IF EXISTS brand_subscriptions CASCADE;

-- 4. Update the trigger function for new user subscription creation
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, status, brand_quantity, competitor_quantity)
  VALUES (NEW.id, 'inactive', 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update existing inactive subscriptions to have 0 quantities
UPDATE subscriptions
SET brand_quantity = 0, competitor_quantity = 0
WHERE status = 'inactive' AND brand_quantity IS NULL;
