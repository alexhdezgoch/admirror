-- Migration: Video creative tagging
-- Extends the image tagging pipeline to process video ads
-- Adds video-specific taxonomy (7 dimensions), keyframe analysis, and transcription

-- 1. Add video tagging columns to ads table
ALTER TABLE ads ADD COLUMN IF NOT EXISTS video_tagging_status TEXT DEFAULT 'pending';
ALTER TABLE ads ADD COLUMN IF NOT EXISTS video_tagging_retry_count INTEGER DEFAULT 0;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS video_tagging_last_error TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS video_tagging_attempted_at TIMESTAMPTZ;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS transcript_word_count INTEGER;

-- 2. Create video_tags table (one row per video ad)
CREATE TABLE IF NOT EXISTS video_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT UNIQUE REFERENCES ads(id) ON DELETE CASCADE,

  -- Hook frame visual tags (same 12 dimensions as creative_tags)
  hook_format_type TEXT CHECK (hook_format_type IN ('static_image', 'ugc_talking_head', 'product_demo', 'motion_graphics', 'lifestyle_photo', 'before_after', 'carousel_card', 'screenshot_testimonial')),
  hook_hook_type_visual TEXT CHECK (hook_hook_type_visual IN ('problem_agitation', 'bold_claim', 'question', 'statistic', 'curiosity_gap', 'social_proof', 'none')),
  hook_human_presence TEXT CHECK (hook_human_presence IN ('full_face', 'partial_body', 'hands_only', 'no_human', 'crowd_multiple')),
  hook_text_overlay_density TEXT CHECK (hook_text_overlay_density IN ('none', 'minimal_headline_only', 'moderate', 'heavy_text_dominant')),
  hook_text_overlay_position TEXT CHECK (hook_text_overlay_position IN ('top', 'center', 'bottom', 'split_top_bottom', 'none')),
  hook_color_temperature TEXT CHECK (hook_color_temperature IN ('warm', 'cool', 'neutral', 'high_contrast', 'muted')),
  hook_background_style TEXT CHECK (hook_background_style IN ('solid_color', 'gradient', 'real_environment', 'studio', 'blurred')),
  hook_product_visibility TEXT CHECK (hook_product_visibility IN ('hero_center', 'in_use', 'secondary', 'not_visible')),
  hook_cta_visual_style TEXT CHECK (hook_cta_visual_style IN ('button', 'text_only', 'overlay_banner', 'end_card', 'none')),
  hook_visual_composition TEXT CHECK (hook_visual_composition IN ('centered_single', 'split_screen', 'grid_collage', 'full_bleed', 'framed')),
  hook_brand_element_presence TEXT CHECK (hook_brand_element_presence IN ('logo_visible', 'brand_colors_dominant', 'neither', 'both')),
  hook_emotion_energy_level TEXT CHECK (hook_emotion_energy_level IN ('calm_aspirational', 'urgent_high_energy', 'educational_neutral', 'emotional_storytelling', 'humorous')),

  -- Video-specific taxonomy (7 dimensions)
  script_structure TEXT CHECK (script_structure IN ('problem_solution', 'testimonial_narrative', 'listicle_tips', 'demonstration', 'story_arc', 'no_script_music_only')),
  verbal_hook_type TEXT CHECK (verbal_hook_type IN ('question', 'bold_claim', 'statistic', 'direct_address', 'pain_point', 'none_no_speech')),
  pacing TEXT CHECK (pacing IN ('fast_cut_under_3s', 'moderate_3_5s', 'slow_single_shot', 'mixed')),
  audio_style TEXT CHECK (audio_style IN ('voiceover', 'direct_to_camera', 'music_only', 'mixed_voice_and_music', 'silent')),
  video_duration_bucket TEXT CHECK (video_duration_bucket IN ('under_15s', '15_to_30s', '30_to_60s', 'over_60s')),
  narrative_arc TEXT CHECK (narrative_arc IN ('single_scene', 'face_to_product', 'product_to_result', 'problem_to_solution', 'testimonial_to_cta', 'multi_scene_montage')),
  opening_frame TEXT CHECK (opening_frame IN ('human_face', 'text_hook', 'product_closeup', 'environment_scene', 'brand_logo')),

  -- Visual shift tracking
  visual_shifts JSONB DEFAULT '[]',
  keyframe_count INTEGER DEFAULT 5,

  -- Metadata
  model_version TEXT NOT NULL,
  transcription_model TEXT,
  transcription_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_video_tags_script_structure ON video_tags(script_structure);
CREATE INDEX IF NOT EXISTS idx_video_tags_pacing ON video_tags(pacing);
CREATE INDEX IF NOT EXISTS idx_video_tags_audio_style ON video_tags(audio_style);
CREATE INDEX IF NOT EXISTS idx_video_tags_narrative_arc ON video_tags(narrative_arc);
CREATE INDEX IF NOT EXISTS idx_ads_video_tagging_status ON ads(video_tagging_status);

-- 4. Create video_tagging_cost_log table
CREATE TABLE IF NOT EXISTS video_tagging_cost_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id TEXT REFERENCES ads(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  estimated_cost_usd NUMERIC(10,6) NOT NULL,
  duration_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  stage TEXT CHECK (stage IN ('keyframe_extraction', 'transcription', 'hook_tagging', 'video_tagging', 'shift_detection')),
  audio_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS policies for video_tags
ALTER TABLE video_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view video tags for their own ads"
  ON video_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads WHERE ads.id = video_tags.ad_id AND ads.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to video_tags"
  ON video_tags FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 6. RLS policies for video_tagging_cost_log
ALTER TABLE video_tagging_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view video cost logs for their own ads"
  ON video_tagging_cost_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ads WHERE ads.id = video_tagging_cost_log.ad_id AND ads.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role has full access to video_tagging_cost_log"
  ON video_tagging_cost_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 7. Backfill existing ads
UPDATE ads SET video_tagging_status = 'pending' WHERE is_video = true AND video_tagging_status IS NULL;
UPDATE ads SET video_tagging_status = 'not_applicable' WHERE is_video = false;
