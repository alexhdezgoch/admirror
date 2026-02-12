-- 013_add_campaigns_adsets_breakdowns.sql
-- Adds campaign, ad set, and breakdown tables for richer Meta sync data

-- ============================================
-- CLIENT CAMPAIGNS TABLE
-- ============================================

CREATE TABLE client_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  meta_campaign_id TEXT NOT NULL,
  name TEXT,
  objective TEXT,
  status TEXT,
  daily_budget DECIMAL(12,2),
  lifetime_budget DECIMAL(12,2),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_brand_id, meta_campaign_id)
);

CREATE TRIGGER client_campaigns_updated
  BEFORE UPDATE ON client_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CLIENT AD SETS TABLE
-- ============================================

CREATE TABLE client_ad_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES client_campaigns(id) ON DELETE CASCADE NOT NULL,
  meta_adset_id TEXT NOT NULL,
  name TEXT,
  status TEXT,
  daily_budget DECIMAL(12,2),
  optimization_goal TEXT,
  targeting JSONB,
  -- Ad-set-level insights
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  cpc DECIMAL(10,4) DEFAULT 0,
  cpm DECIMAL(10,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  roas DECIMAL(10,4) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_brand_id, meta_adset_id)
);

CREATE TRIGGER client_ad_sets_updated
  BEFORE UPDATE ON client_ad_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- CLIENT AD BREAKDOWNS TABLE
-- ============================================

CREATE TABLE client_ad_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  meta_adset_id TEXT NOT NULL,
  breakdown_type TEXT NOT NULL,
  breakdown_value TEXT NOT NULL,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  ctr DECIMAL(8,4) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_brand_id, meta_adset_id, breakdown_type, breakdown_value)
);

CREATE TRIGGER client_ad_breakdowns_updated
  BEFORE UPDATE ON client_ad_breakdowns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ALTER CLIENT_ADS — ADD CAMPAIGN/ADSET FKs
-- ============================================

ALTER TABLE client_ads ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES client_campaigns(id) ON DELETE SET NULL;
ALTER TABLE client_ads ADD COLUMN IF NOT EXISTS adset_id UUID REFERENCES client_ad_sets(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE client_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ad_breakdowns ENABLE ROW LEVEL SECURITY;

-- client_campaigns RLS
CREATE POLICY "Users can view own campaigns" ON client_campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own campaigns" ON client_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own campaigns" ON client_campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own campaigns" ON client_campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- client_ad_sets RLS
CREATE POLICY "Users can view own ad sets" ON client_ad_sets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ad sets" ON client_ad_sets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ad sets" ON client_ad_sets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ad sets" ON client_ad_sets
  FOR DELETE USING (auth.uid() = user_id);

-- client_ad_breakdowns RLS
CREATE POLICY "Users can view own breakdowns" ON client_ad_breakdowns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own breakdowns" ON client_ad_breakdowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own breakdowns" ON client_ad_breakdowns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own breakdowns" ON client_ad_breakdowns
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_client_campaigns_user_id ON client_campaigns(user_id);
CREATE INDEX idx_client_campaigns_brand_id ON client_campaigns(client_brand_id);
CREATE INDEX idx_client_campaigns_meta_id ON client_campaigns(meta_campaign_id);

CREATE INDEX idx_client_ad_sets_user_id ON client_ad_sets(user_id);
CREATE INDEX idx_client_ad_sets_brand_id ON client_ad_sets(client_brand_id);
CREATE INDEX idx_client_ad_sets_campaign_id ON client_ad_sets(campaign_id);
CREATE INDEX idx_client_ad_sets_meta_id ON client_ad_sets(meta_adset_id);

CREATE INDEX idx_client_ad_breakdowns_user_id ON client_ad_breakdowns(user_id);
CREATE INDEX idx_client_ad_breakdowns_brand_id ON client_ad_breakdowns(client_brand_id);
CREATE INDEX idx_client_ad_breakdowns_adset ON client_ad_breakdowns(meta_adset_id);
CREATE INDEX idx_client_ad_breakdowns_type ON client_ad_breakdowns(breakdown_type);

CREATE INDEX idx_client_ads_campaign_id ON client_ads(campaign_id);
CREATE INDEX idx_client_ads_adset_id ON client_ads(adset_id);
