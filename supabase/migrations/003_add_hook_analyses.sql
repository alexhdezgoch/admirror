-- Migration: Add hook_analyses table for caching AI hook analysis results
-- Run this in Supabase SQL Editor

-- hook_analyses table (caches AI hook analysis results per brand)
CREATE TABLE IF NOT EXISTS hook_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id)
);

-- Enable Row Level Security
ALTER TABLE hook_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hook_analyses
CREATE POLICY "Users can view own hook analyses" ON hook_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hook analyses" ON hook_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hook analyses" ON hook_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hook analyses" ON hook_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast lookup by brand_id
CREATE INDEX IF NOT EXISTS idx_hook_analyses_brand_id ON hook_analyses(brand_id);
