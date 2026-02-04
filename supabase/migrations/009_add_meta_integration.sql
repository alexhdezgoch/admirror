-- 009_add_meta_integration.sql
-- Adds Meta (Facebook) Ads API integration tables and columns

-- ============================================
-- META CONNECTIONS TABLE
-- ============================================

-- Stores OAuth tokens and selected ad account per user
CREATE TABLE meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  ad_account_id TEXT,
  ad_account_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for auto-updating updated_at on meta_connections
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meta_connections_updated
  BEFORE UPDATE ON meta_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CLIENT ADS TABLE
-- ============================================

-- Stores the user's own ads pulled from Meta Ads Manager
CREATE TABLE client_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  meta_ad_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  effective_status TEXT,
  -- Creative fields
  thumbnail_url TEXT,
  image_url TEXT,
  body TEXT,
  title TEXT,
  -- Performance metrics
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(10,4) DEFAULT 0,
  cpa DECIMAL(10,4) DEFAULT 0,
  -- Pattern fields (for future AI analysis)
  emotional_angle TEXT,
  narrative_structure TEXT,
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: one row per ad per brand
  UNIQUE(client_brand_id, meta_ad_id)
);

CREATE TRIGGER client_ads_updated
  BEFORE UPDATE ON client_ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ADD COLUMNS TO ADS TABLE
-- ============================================

-- Add pattern analysis columns to competitor ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS emotional_angle TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS narrative_structure TEXT;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ads ENABLE ROW LEVEL SECURITY;

-- RLS for meta_connections
CREATE POLICY "Users can view own meta connections" ON meta_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meta connections" ON meta_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meta connections" ON meta_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meta connections" ON meta_connections
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for client_ads
CREATE POLICY "Users can view own client ads" ON client_ads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client ads" ON client_ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client ads" ON client_ads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own client ads" ON client_ads
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_meta_connections_user_id ON meta_connections(user_id);
CREATE INDEX idx_client_ads_user_id ON client_ads(user_id);
CREATE INDEX idx_client_ads_client_brand_id ON client_ads(client_brand_id);
CREATE INDEX idx_client_ads_meta_ad_id ON client_ads(meta_ad_id);
CREATE INDEX idx_client_ads_brand_meta ON client_ads(client_brand_id, meta_ad_id);
