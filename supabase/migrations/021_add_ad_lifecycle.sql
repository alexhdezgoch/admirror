-- Migration: Ad lifecycle tracking with breakout detection
-- Tracks cohorts of velocity_tester ads, detects breakout survivors,
-- compares creative tags of survivors vs killed ads, and aggregates winning patterns.

-- 1. New columns on ads for lifecycle tracking
ALTER TABLE ads ADD COLUMN IF NOT EXISTS cohort_week DATE;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_breakout BOOLEAN DEFAULT false;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS breakout_detected_at TIMESTAMPTZ;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_cash_cow BOOLEAN DEFAULT false;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS cash_cow_detected_at TIMESTAMPTZ;

-- 2. Backfill cohort_week from launch_date (Monday of the ISO week)
UPDATE ads SET cohort_week = date_trunc('week', launch_date::timestamp)::date WHERE cohort_week IS NULL;

-- 3. Create breakout_events table (one row per breakout cohort)
CREATE TABLE IF NOT EXISTS breakout_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES client_brands(id) ON DELETE CASCADE,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  cohort_start DATE NOT NULL,
  cohort_end DATE NOT NULL,
  analysis_date DATE NOT NULL,
  total_in_cohort INTEGER NOT NULL,
  survivors_count INTEGER NOT NULL,
  killed_count INTEGER NOT NULL,
  survival_rate NUMERIC(5,4) NOT NULL,
  survivor_ad_ids TEXT[] NOT NULL DEFAULT '{}',
  killed_ad_ids TEXT[] NOT NULL DEFAULT '{}',
  survivor_tag_profile JSONB NOT NULL DEFAULT '{}',
  killed_tag_profile JSONB NOT NULL DEFAULT '{}',
  differentiating_elements JSONB NOT NULL DEFAULT '[]',
  top_survivor_traits TEXT[] NOT NULL DEFAULT '{}',
  analysis_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, competitor_id, cohort_start, cohort_end)
);

-- 4. Create lifecycle_analysis_snapshots table (aggregated per brand per week)
CREATE TABLE IF NOT EXISTS lifecycle_analysis_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES client_brands(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_breakout_events INTEGER NOT NULL DEFAULT 0,
  total_breakout_ads INTEGER NOT NULL DEFAULT 0,
  total_cash_cows INTEGER NOT NULL DEFAULT 0,
  winning_patterns JSONB NOT NULL DEFAULT '[]',
  cash_cow_transitions JSONB NOT NULL DEFAULT '[]',
  analysis_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, snapshot_date)
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_breakout_events_brand_date ON breakout_events(brand_id, analysis_date);
CREATE INDEX IF NOT EXISTS idx_lifecycle_snapshots_brand_date ON lifecycle_analysis_snapshots(brand_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_ads_is_breakout ON ads(is_breakout) WHERE is_breakout = true;
CREATE INDEX IF NOT EXISTS idx_ads_is_cash_cow ON ads(is_cash_cow) WHERE is_cash_cow = true;
CREATE INDEX IF NOT EXISTS idx_ads_cohort_week ON ads(cohort_week) WHERE cohort_week IS NOT NULL;

-- 6. RLS for breakout_events
ALTER TABLE breakout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view breakout events for their own brands"
  ON breakout_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_brands
      WHERE client_brands.id = breakout_events.brand_id
        AND client_brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to breakout_events"
  ON breakout_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. RLS for lifecycle_analysis_snapshots
ALTER TABLE lifecycle_analysis_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lifecycle snapshots for their own brands"
  ON lifecycle_analysis_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_brands
      WHERE client_brands.id = lifecycle_analysis_snapshots.brand_id
        AND client_brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to lifecycle_analysis_snapshots"
  ON lifecycle_analysis_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
