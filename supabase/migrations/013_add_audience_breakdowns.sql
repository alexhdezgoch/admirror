-- 013_add_audience_breakdowns.sql
-- Stores account-level audience breakdowns from Meta Insights API (age × gender × platform)

CREATE TABLE client_ad_audience_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_brand_id UUID NOT NULL REFERENCES client_brands(id) ON DELETE CASCADE,
  -- Breakdown dimensions
  age TEXT,                  -- '18-24', '25-34', '35-44', '45-54', '55-64', '65+'
  gender TEXT,               -- 'male', 'female', 'unknown'
  publisher_platform TEXT,   -- 'facebook', 'instagram', 'audience_network', 'messenger'
  -- Metrics (account-level aggregates per breakdown combo)
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  spend DECIMAL(12,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(12,2) DEFAULT 0,
  -- Timestamps
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- One row per brand + breakdown combo
  UNIQUE(client_brand_id, age, gender, publisher_platform)
);

CREATE TRIGGER client_ad_audience_breakdowns_updated
  BEFORE UPDATE ON client_ad_audience_breakdowns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE client_ad_audience_breakdowns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audience breakdowns" ON client_ad_audience_breakdowns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audience breakdowns" ON client_ad_audience_breakdowns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audience breakdowns" ON client_ad_audience_breakdowns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own audience breakdowns" ON client_ad_audience_breakdowns
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_audience_breakdowns_user_id ON client_ad_audience_breakdowns(user_id);
CREATE INDEX idx_audience_breakdowns_brand_id ON client_ad_audience_breakdowns(client_brand_id);
CREATE INDEX idx_audience_breakdowns_brand_dims ON client_ad_audience_breakdowns(client_brand_id, age, gender, publisher_platform);
