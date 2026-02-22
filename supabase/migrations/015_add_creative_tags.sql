-- Migration: Creative intelligence tagging
-- Add image dedup + AI-powered creative taxonomy classification
-- Supports 12-dimension taxonomy via Claude Sonnet vision API

-- 1. Add tagging columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS image_hash TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tagging_status TEXT DEFAULT 'pending';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tagging_retry_count INTEGER DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tagging_last_error TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS tagging_attempted_at TIMESTAMPTZ;

-- 2. Create creative_tags table (one row per ad)
CREATE TABLE IF NOT EXISTS creative_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT UNIQUE REFERENCES ads(id) ON DELETE CASCADE,
  format_type TEXT CHECK (format_type IN ('static_image', 'ugc_talking_head', 'product_demo', 'motion_graphics', 'lifestyle_photo', 'before_after', 'carousel_card', 'screenshot_testimonial')),
  hook_type_visual TEXT CHECK (hook_type_visual IN ('problem_agitation', 'bold_claim', 'question', 'statistic', 'curiosity_gap', 'social_proof', 'none')),
  human_presence TEXT CHECK (human_presence IN ('full_face', 'partial_body', 'hands_only', 'no_human', 'crowd_multiple')),
  text_overlay_density TEXT CHECK (text_overlay_density IN ('none', 'minimal_headline_only', 'moderate', 'heavy_text_dominant')),
  text_overlay_position TEXT CHECK (text_overlay_position IN ('top', 'center', 'bottom', 'split_top_bottom', 'none')),
  color_temperature TEXT CHECK (color_temperature IN ('warm', 'cool', 'neutral', 'high_contrast', 'muted')),
  background_style TEXT CHECK (background_style IN ('solid_color', 'gradient', 'real_environment', 'studio', 'blurred')),
  product_visibility TEXT CHECK (product_visibility IN ('hero_center', 'in_use', 'secondary', 'not_visible')),
  cta_visual_style TEXT CHECK (cta_visual_style IN ('button', 'text_only', 'overlay_banner', 'end_card', 'none')),
  visual_composition TEXT CHECK (visual_composition IN ('centered_single', 'split_screen', 'grid_collage', 'full_bleed', 'framed')),
  brand_element_presence TEXT CHECK (brand_element_presence IN ('logo_visible', 'brand_colors_dominant', 'neither', 'both')),
  emotion_energy_level TEXT CHECK (emotion_energy_level IN ('calm_aspirational', 'urgent_high_energy', 'educational_neutral', 'emotional_storytelling', 'humorous')),
  model_version TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('vision_api', 'hash_dedup')),
  source_ad_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes on most-queried dimensions
CREATE INDEX IF NOT EXISTS idx_creative_tags_format_type ON creative_tags(format_type);
CREATE INDEX IF NOT EXISTS idx_creative_tags_hook_type_visual ON creative_tags(hook_type_visual);
CREATE INDEX IF NOT EXISTS idx_creative_tags_human_presence ON creative_tags(human_presence);
CREATE INDEX IF NOT EXISTS idx_creative_tags_emotion_energy_level ON creative_tags(emotion_energy_level);
CREATE INDEX IF NOT EXISTS idx_ads_image_hash ON ads(image_hash);
CREATE INDEX IF NOT EXISTS idx_ads_tagging_status ON ads(tagging_status);

-- 4. Create tagging_cost_log table
CREATE TABLE IF NOT EXISTS tagging_cost_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT REFERENCES ads(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_usd NUMERIC(10,6) NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS policies for creative_tags
ALTER TABLE creative_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tags for their own ads"
  ON creative_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads WHERE ads.id = creative_tags.ad_id AND ads.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to creative_tags"
  ON creative_tags FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. RLS policies for tagging_cost_log
ALTER TABLE tagging_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost logs for their own ads"
  ON tagging_cost_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads WHERE ads.id = tagging_cost_log.ad_id AND ads.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to tagging_cost_log"
  ON tagging_cost_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. Backfill existing ads to pending status
UPDATE ads SET tagging_status = 'pending' WHERE tagging_status IS NULL;
