-- Allow brand_id to be null in brand_subscriptions
-- This enables purchasing a brand slot before creating the brand

-- Drop the existing unique constraint
ALTER TABLE brand_subscriptions DROP CONSTRAINT IF EXISTS brand_subscriptions_brand_id_key;

-- Alter the column to allow NULL
ALTER TABLE brand_subscriptions ALTER COLUMN brand_id DROP NOT NULL;

-- Add a new unique constraint that only applies to non-null brand_ids
-- This prevents multiple subscriptions for the same brand while allowing multiple unassigned slots
CREATE UNIQUE INDEX IF NOT EXISTS brand_subscriptions_brand_id_unique
  ON brand_subscriptions(brand_id)
  WHERE brand_id IS NOT NULL;

-- Add an index on user_id for faster lookups when checking brand limits
CREATE INDEX IF NOT EXISTS brand_subscriptions_user_id_idx
  ON brand_subscriptions(user_id);

-- Add an index on status for filtering active subscriptions
CREATE INDEX IF NOT EXISTS brand_subscriptions_status_idx
  ON brand_subscriptions(status);
