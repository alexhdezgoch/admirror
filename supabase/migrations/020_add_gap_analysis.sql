-- Migration: Creative gap analysis
-- Compares client ads against competitor winning patterns
-- Stores prioritized gap analysis snapshots per brand

-- 1. Allow client ads to have nullable competitor_id and competitor_name
ALTER TABLE ads ALTER COLUMN competitor_id DROP NOT NULL;
ALTER TABLE ads ALTER COLUMN competitor_name DROP NOT NULL;

-- 2. Create gap_analysis_snapshots table
CREATE TABLE IF NOT EXISTS gap_analysis_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES client_brands(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_client_ads INTEGER NOT NULL,
  total_competitor_ads INTEGER NOT NULL,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, snapshot_date)
);

-- 3. Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_gap_analysis_brand_date ON gap_analysis_snapshots(brand_id, snapshot_date);

-- 4. RLS policies
ALTER TABLE gap_analysis_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gap analysis for their own brands"
  ON gap_analysis_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_brands
      WHERE client_brands.id = gap_analysis_snapshots.brand_id
        AND client_brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to gap_analysis_snapshots"
  ON gap_analysis_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
