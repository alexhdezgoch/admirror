-- AdMirror Database Schema
-- Run this in Supabase SQL Editor to set up your database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- client_brands table
CREATE TABLE client_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT DEFAULT '🏢',
  industry TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  ads_library_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- competitors table
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo TEXT DEFAULT '🏢',
  url TEXT,
  total_ads INTEGER DEFAULT 0,
  avg_ads_per_week DECIMAL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ads table
CREATE TABLE ads (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_brand_id UUID REFERENCES client_brands(id) ON DELETE CASCADE NOT NULL,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE NOT NULL,
  competitor_name TEXT NOT NULL,
  competitor_logo TEXT DEFAULT '🏢',
  format TEXT NOT NULL,
  days_active INTEGER DEFAULT 0,
  variation_count INTEGER DEFAULT 1,
  launch_date DATE NOT NULL,
  hook_text TEXT,
  headline TEXT,
  primary_text TEXT,
  cta TEXT,
  hook_type TEXT,
  is_video BOOLEAN DEFAULT false,
  video_duration INTEGER,
  creative_elements TEXT[] DEFAULT '{}',
  in_swipe_file BOOLEAN DEFAULT false,
  scoring JSONB,
  thumbnail_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ad_analyses table (caches AI analysis results)
CREATE TABLE ad_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id TEXT REFERENCES ads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ad_id)
);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to auto-update last_updated on client_brands
CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER client_brands_updated
  BEFORE UPDATE ON client_brands
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

-- Trigger to auto-update updated_at on ads
CREATE TRIGGER ads_updated
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_last_updated();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable Row Level Security
ALTER TABLE client_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_brands
CREATE POLICY "Users can view own brands" ON client_brands
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brands" ON client_brands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands" ON client_brands
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands" ON client_brands
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for competitors (via brand ownership)
CREATE POLICY "Users can view competitors of own brands" ON competitors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM client_brands WHERE id = competitors.brand_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert competitors to own brands" ON competitors
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM client_brands WHERE id = competitors.brand_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update competitors of own brands" ON competitors
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM client_brands WHERE id = competitors.brand_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete competitors of own brands" ON competitors
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM client_brands WHERE id = competitors.brand_id AND user_id = auth.uid())
  );

-- RLS Policies for ads
CREATE POLICY "Users can view own ads" ON ads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ads" ON ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ads" ON ads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ads" ON ads
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for ad_analyses
CREATE POLICY "Users can view own analyses" ON ad_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses" ON ad_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analyses" ON ad_analyses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON ad_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================

-- Create indexes for performance
CREATE INDEX idx_client_brands_user_id ON client_brands(user_id);
CREATE INDEX idx_competitors_brand_id ON competitors(brand_id);
CREATE INDEX idx_ads_user_id ON ads(user_id);
CREATE INDEX idx_ads_client_brand_id ON ads(client_brand_id);
CREATE INDEX idx_ads_competitor_id ON ads(competitor_id);
CREATE INDEX idx_ads_in_swipe_file ON ads(user_id, in_swipe_file) WHERE in_swipe_file = true;
CREATE INDEX idx_ad_analyses_ad_id ON ad_analyses(ad_id);
