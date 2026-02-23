-- Migration: Competitor classification tracks
-- Automatically classifies competitors as Track A (Consolidator) or Track B (Velocity Tester)
-- based on their ad launch behavior, and calculates signal strength per ad

-- 1. Add classification columns to competitors table
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS track TEXT CHECK (track IN ('consolidator', 'velocity_tester'));
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS track_classified_at TIMESTAMPTZ;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS new_ads_30d INTEGER DEFAULT 0;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS total_ads_launched_30d INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS survived_14d INTEGER;
ALTER TABLE competitors ADD COLUMN IF NOT EXISTS survival_rate NUMERIC(5,4);

-- 2. Add signal strength and track to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS competitor_track TEXT CHECK (competitor_track IN ('consolidator', 'velocity_tester'));
ALTER TABLE ads ADD COLUMN IF NOT EXISTS signal_strength INTEGER CHECK (signal_strength >= 0 AND signal_strength <= 100);

-- 3. Create track_change_log table for strategic events
CREATE TABLE IF NOT EXISTS track_change_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id TEXT REFERENCES competitors(id) ON DELETE CASCADE,
  previous_track TEXT,
  new_track TEXT NOT NULL CHECK (new_track IN ('consolidator', 'velocity_tester')),
  new_ads_30d INTEGER NOT NULL,
  survival_rate NUMERIC(5,4),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_track ON competitors(track);
CREATE INDEX IF NOT EXISTS idx_ads_competitor_track ON ads(competitor_track);
CREATE INDEX IF NOT EXISTS idx_ads_signal_strength ON ads(signal_strength);
CREATE INDEX IF NOT EXISTS idx_track_change_log_competitor ON track_change_log(competitor_id);

-- 5. RLS policies for track_change_log
ALTER TABLE track_change_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view track changes for their competitors"
  ON track_change_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitors
      WHERE competitors.id = track_change_log.competitor_id
        AND competitors.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to track_change_log"
  ON track_change_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
