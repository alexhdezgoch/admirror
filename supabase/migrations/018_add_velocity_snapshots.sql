-- Migration: Creative element velocity snapshots
-- Stores historical weighted prevalence data for trend analysis

CREATE TABLE IF NOT EXISTS velocity_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id TEXT REFERENCES client_brands(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  track_filter TEXT CHECK (track_filter IN ('all', 'consolidator', 'velocity_tester')),
  dimension TEXT NOT NULL,
  value TEXT NOT NULL,
  weighted_prevalence NUMERIC(8,6) NOT NULL,
  ad_count INTEGER NOT NULL,
  total_signal_strength INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (brand_id, snapshot_date, track_filter, dimension, value)
);

CREATE INDEX IF NOT EXISTS idx_velocity_snapshots_brand_date ON velocity_snapshots(brand_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_velocity_snapshots_dimension ON velocity_snapshots(dimension, value);

ALTER TABLE velocity_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view velocity snapshots for their own brands"
  ON velocity_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM client_brands
      WHERE client_brands.id = velocity_snapshots.brand_id
        AND client_brands.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to velocity_snapshots"
  ON velocity_snapshots FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
