-- Pattern analyses cache table
-- Stores AI-generated pattern analysis results per brand per user
CREATE TABLE pattern_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One cached analysis per brand per user
  UNIQUE(brand_id, user_id)
);

-- Indexes
CREATE INDEX idx_pattern_analyses_brand_id ON pattern_analyses(brand_id);
CREATE INDEX idx_pattern_analyses_user_id ON pattern_analyses(user_id);

-- RLS
ALTER TABLE pattern_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pattern analyses" ON pattern_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pattern analyses" ON pattern_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pattern analyses" ON pattern_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pattern analyses" ON pattern_analyses
  FOR DELETE USING (auth.uid() = user_id);
