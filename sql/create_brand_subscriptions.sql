-- Run this in Supabase Dashboard SQL Editor
-- Creates the brand_subscriptions table for per-brand subscription tracking

CREATE TABLE IF NOT EXISTS brand_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES client_brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  competitor_limit INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- Enable RLS
ALTER TABLE brand_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own brand subscriptions
CREATE POLICY "Users can view own brand subscriptions"
  ON brand_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update/delete (via webhook)
CREATE POLICY "Service role can manage brand subscriptions"
  ON brand_subscriptions FOR ALL
  USING (auth.role() = 'service_role');
