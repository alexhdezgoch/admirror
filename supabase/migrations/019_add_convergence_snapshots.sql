-- Migration: Creative convergence snapshots
-- Stores convergence analysis results for detecting market-wide creative shifts

CREATE TABLE IF NOT EXISTS convergence_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES client_brands(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  convergence_ratio NUMERIC(8,6) NOT NULL,
  adjusted_score NUMERIC(8,6) NOT NULL,
  classification TEXT CHECK (classification IN ('STRONG_CONVERGENCE', 'MODERATE_CONVERGENCE', 'EMERGING_PATTERN', 'NO_CONVERGENCE')),
  cross_track BOOLEAN DEFAULT false,
  confidence NUMERIC(8,6) NOT NULL,
  competitors_increasing INTEGER NOT NULL,
  total_competitors INTEGER NOT NULL,
  track_a_increasing INTEGER DEFAULT 0,
  track_b_increasing INTEGER DEFAULT 0,
  competitor_details JSONB DEFAULT '[]',
  is_new_alert BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, snapshot_date, dimension, value)
);

CREATE INDEX IF NOT EXISTS idx_convergence_brand_date ON convergence_snapshots(brand_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_convergence_classification ON convergence_snapshots(classification);
CREATE INDEX IF NOT EXISTS idx_convergence_alerts ON convergence_snapshots(is_new_alert) WHERE is_new_alert = true;

ALTER TABLE convergence_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view convergence snapshots for their own brands"
  ON convergence_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_brands
      WHERE client_brands.id = convergence_snapshots.brand_id
        AND client_brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to convergence_snapshots"
  ON convergence_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
