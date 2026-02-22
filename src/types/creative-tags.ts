import type {
  FormatType,
  HookTypeVisual,
  HumanPresence,
  TextOverlayDensity,
  TextOverlayPosition,
  ColorTemperature,
  BackgroundStyle,
  ProductVisibility,
  CtaVisualStyle,
  VisualComposition,
  BrandElementPresence,
  EmotionEnergyLevel,
} from '@/lib/tagging/taxonomy';

import type {
  ScriptStructure,
  VerbalHookType,
  Pacing,
  AudioStyle,
  VideoDurationBucket,
  NarrativeArc,
  OpeningFrame,
} from '@/lib/tagging/video-taxonomy';

export interface CreativeTagSet {
  format_type: FormatType;
  hook_type_visual: HookTypeVisual;
  human_presence: HumanPresence;
  text_overlay_density: TextOverlayDensity;
  text_overlay_position: TextOverlayPosition;
  color_temperature: ColorTemperature;
  background_style: BackgroundStyle;
  product_visibility: ProductVisibility;
  cta_visual_style: CtaVisualStyle;
  visual_composition: VisualComposition;
  brand_element_presence: BrandElementPresence;
  emotion_energy_level: EmotionEnergyLevel;
}

export interface TaggingResult {
  tags?: CreativeTagSet;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  error?: string;
}

export interface PipelineStats {
  total: number;
  tagged: number;
  deduped: number;
  failed: number;
  skipped: number;
  totalCostUsd: number;
  durationMs: number;
}

export interface TaggingCostEntry {
  ad_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number;
  success: boolean;
  error_message?: string;
}

export interface VideoTagSet {
  script_structure: ScriptStructure;
  verbal_hook_type: VerbalHookType;
  pacing: Pacing;
  audio_style: AudioStyle;
  video_duration_bucket: VideoDurationBucket;
  narrative_arc: NarrativeArc;
  opening_frame: OpeningFrame;
}

export interface VideoTaggingResult {
  tags?: VideoTagSet;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
  error?: string;
}

export interface VideoPipelineStats {
  total: number;
  tagged: number;
  failed: number;
  skipped: number;
  noAudio: number;
  totalCostUsd: number;
  durationMs: number;
}

export interface CombinedPipelineStats {
  image: PipelineStats;
  video: VideoPipelineStats;
}
