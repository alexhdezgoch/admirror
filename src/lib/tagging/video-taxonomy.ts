export const SCRIPT_STRUCTURE_VALUES = ['problem_solution', 'testimonial_narrative', 'listicle_tips', 'demonstration', 'story_arc', 'no_script_music_only'] as const;
export const VERBAL_HOOK_TYPE_VALUES = ['question', 'bold_claim', 'statistic', 'direct_address', 'pain_point', 'none_no_speech'] as const;
export const PACING_VALUES = ['fast_cut_under_3s', 'moderate_3_5s', 'slow_single_shot', 'mixed'] as const;
export const AUDIO_STYLE_VALUES = ['voiceover', 'direct_to_camera', 'music_only', 'mixed_voice_and_music', 'silent'] as const;
export const VIDEO_DURATION_BUCKET_VALUES = ['under_15s', '15_to_30s', '30_to_60s', 'over_60s'] as const;
export const NARRATIVE_ARC_VALUES = ['single_scene', 'face_to_product', 'product_to_result', 'problem_to_solution', 'testimonial_to_cta', 'multi_scene_montage'] as const;
export const OPENING_FRAME_VALUES = ['human_face', 'text_hook', 'product_closeup', 'environment_scene', 'brand_logo'] as const;

export type ScriptStructure = typeof SCRIPT_STRUCTURE_VALUES[number];
export type VerbalHookType = typeof VERBAL_HOOK_TYPE_VALUES[number];
export type Pacing = typeof PACING_VALUES[number];
export type AudioStyle = typeof AUDIO_STYLE_VALUES[number];
export type VideoDurationBucket = typeof VIDEO_DURATION_BUCKET_VALUES[number];
export type NarrativeArc = typeof NARRATIVE_ARC_VALUES[number];
export type OpeningFrame = typeof OPENING_FRAME_VALUES[number];

export const VIDEO_TAXONOMY_DIMENSIONS: Record<string, readonly string[]> = {
  script_structure: SCRIPT_STRUCTURE_VALUES,
  verbal_hook_type: VERBAL_HOOK_TYPE_VALUES,
  pacing: PACING_VALUES,
  audio_style: AUDIO_STYLE_VALUES,
  video_duration_bucket: VIDEO_DURATION_BUCKET_VALUES,
  narrative_arc: NARRATIVE_ARC_VALUES,
  opening_frame: OPENING_FRAME_VALUES,
};

export const VIDEO_DIMENSION_KEYS = Object.keys(VIDEO_TAXONOMY_DIMENSIONS);

export function getDurationBucket(seconds: number): VideoDurationBucket {
  if (seconds < 15) return 'under_15s';
  if (seconds < 30) return '15_to_30s';
  if (seconds < 60) return '30_to_60s';
  return 'over_60s';
}

export function validateVideoTagSet(tags: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
    return { valid: false, errors: ['Tags must be a non-null object'] };
  }

  const tagObj = tags as Record<string, unknown>;

  for (const [key, allowedValues] of Object.entries(VIDEO_TAXONOMY_DIMENSIONS)) {
    if (!(key in tagObj)) {
      errors.push(`Missing dimension: ${key}`);
      continue;
    }
    const value = tagObj[key];
    if (typeof value !== 'string' || !allowedValues.includes(value)) {
      errors.push(`Invalid value for ${key}: "${value}". Must be one of: ${allowedValues.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildVideoTaggingPrompt(transcript: string, hookTagsSummary: string): string {
  // Only classify 6 dimensions — duration_bucket is calculated from metadata
  const classifyDimensions = Object.entries(VIDEO_TAXONOMY_DIMENSIONS)
    .filter(([key]) => key !== 'video_duration_bucket')
    .map(([key, values]) => `  "${key}": one of [${values.map(v => `"${v}"`).join(', ')}]`)
    .join(',\n');

  return `Analyze this video ad based on the transcript and hook frame visual context below.
Classify it across exactly 6 dimensions.
Pick EXACTLY ONE value per dimension.
Return ONLY a JSON object with no markdown, no explanation.

TRANSCRIPT:
${transcript || '[No speech detected — music/silent video]'}

HOOK FRAME VISUAL CONTEXT:
${hookTagsSummary}

{
${classifyDimensions}
}`;
}
