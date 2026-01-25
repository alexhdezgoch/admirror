-- Subscriptions table for Stripe billing
-- Tracks user subscription status and competitor limits

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'inactive', -- 'active', 'canceled', 'past_due', 'inactive'
  competitor_limit INTEGER DEFAULT 1, -- First competitor free
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- Add user_id to competitors table for tracking ownership
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Backfill user_id from client_brands (existing competitors)
UPDATE competitors c
SET user_id = (
  SELECT user_id FROM client_brands b WHERE b.id = c.brand_id
)
WHERE c.user_id IS NULL;

-- Create index for competitor counting by user
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);

-- Function to auto-create subscription record for new users
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, status, competitor_limit)
  VALUES (NEW.id, 'inactive', 1)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create subscription when user is created
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_subscription_for_new_user();

-- Create subscriptions for existing users who don't have one
INSERT INTO subscriptions (user_id, status, competitor_limit)
SELECT id, 'inactive', 1 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
