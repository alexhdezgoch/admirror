-- Migration: Add ad_analyses table for caching AI analysis results
-- Run this in Supabase SQL Editor if you already have the base schema

-- ad_analyses table (caches AI analysis results)
CREATE TABLE IF NOT EXISTS ad_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id TEXT REFERENCES ads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id)
);

-- Enable Row Level Security
ALTER TABLE ad_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_analyses
CREATE POLICY "Users can view own analyses" ON ad_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON ad_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON ad_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON ad_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookup by ad_id
CREATE INDEX IF NOT EXISTS idx_ad_analyses_ad_id ON ad_analyses(ad_id);
