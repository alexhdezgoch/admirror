export const FORMAT_TYPE_VALUES = ['static_image', 'ugc_talking_head', 'product_demo', 'motion_graphics', 'lifestyle_photo', 'before_after', 'carousel_card', 'screenshot_testimonial'] as const;
export const HOOK_TYPE_VISUAL_VALUES = ['problem_agitation', 'bold_claim', 'question', 'statistic', 'curiosity_gap', 'social_proof', 'none'] as const;
export const HUMAN_PRESENCE_VALUES = ['full_face', 'partial_body', 'hands_only', 'no_human', 'crowd_multiple'] as const;
export const TEXT_OVERLAY_DENSITY_VALUES = ['none', 'minimal_headline_only', 'moderate', 'heavy_text_dominant'] as const;
export const TEXT_OVERLAY_POSITION_VALUES = ['top', 'center', 'bottom', 'split_top_bottom', 'none'] as const;
export const COLOR_TEMPERATURE_VALUES = ['warm', 'cool', 'neutral', 'high_contrast', 'muted'] as const;
export const BACKGROUND_STYLE_VALUES = ['solid_color', 'gradient', 'real_environment', 'studio', 'blurred'] as const;
export const PRODUCT_VISIBILITY_VALUES = ['hero_center', 'in_use', 'secondary', 'not_visible'] as const;
export const CTA_VISUAL_STYLE_VALUES = ['button', 'text_only', 'overlay_banner', 'end_card', 'none'] as const;
export const VISUAL_COMPOSITION_VALUES = ['centered_single', 'split_screen', 'grid_collage', 'full_bleed', 'framed'] as const;
export const BRAND_ELEMENT_PRESENCE_VALUES = ['logo_visible', 'brand_colors_dominant', 'neither', 'both'] as const;
export const EMOTION_ENERGY_LEVEL_VALUES = ['calm_aspirational', 'urgent_high_energy', 'educational_neutral', 'emotional_storytelling', 'humorous'] as const;

export type FormatType = typeof FORMAT_TYPE_VALUES[number];
export type HookTypeVisual = typeof HOOK_TYPE_VISUAL_VALUES[number];
export type HumanPresence = typeof HUMAN_PRESENCE_VALUES[number];
export type TextOverlayDensity = typeof TEXT_OVERLAY_DENSITY_VALUES[number];
export type TextOverlayPosition = typeof TEXT_OVERLAY_POSITION_VALUES[number];
export type ColorTemperature = typeof COLOR_TEMPERATURE_VALUES[number];
export type BackgroundStyle = typeof BACKGROUND_STYLE_VALUES[number];
export type ProductVisibility = typeof PRODUCT_VISIBILITY_VALUES[number];
export type CtaVisualStyle = typeof CTA_VISUAL_STYLE_VALUES[number];
export type VisualComposition = typeof VISUAL_COMPOSITION_VALUES[number];
export type BrandElementPresence = typeof BRAND_ELEMENT_PRESENCE_VALUES[number];
export type EmotionEnergyLevel = typeof EMOTION_ENERGY_LEVEL_VALUES[number];

export const TAXONOMY_DIMENSIONS: Record<string, readonly string[]> = {
  format_type: FORMAT_TYPE_VALUES,
  hook_type_visual: HOOK_TYPE_VISUAL_VALUES,
  human_presence: HUMAN_PRESENCE_VALUES,
  text_overlay_density: TEXT_OVERLAY_DENSITY_VALUES,
  text_overlay_position: TEXT_OVERLAY_POSITION_VALUES,
  color_temperature: COLOR_TEMPERATURE_VALUES,
  background_style: BACKGROUND_STYLE_VALUES,
  product_visibility: PRODUCT_VISIBILITY_VALUES,
  cta_visual_style: CTA_VISUAL_STYLE_VALUES,
  visual_composition: VISUAL_COMPOSITION_VALUES,
  brand_element_presence: BRAND_ELEMENT_PRESENCE_VALUES,
  emotion_energy_level: EMOTION_ENERGY_LEVEL_VALUES,
};

export const DIMENSION_KEYS = Object.keys(TAXONOMY_DIMENSIONS);

export function validateTagSet(tags: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!tags || typeof tags !== 'object' || Array.isArray(tags)) {
    return { valid: false, errors: ['Tags must be a non-null object'] };
  }

  const tagObj = tags as Record<string, unknown>;

  for (const [key, allowedValues] of Object.entries(TAXONOMY_DIMENSIONS)) {
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

export function buildTaggingPrompt(): string {
  const dimensionLines = Object.entries(TAXONOMY_DIMENSIONS)
    .map(([key, values]) => `  "${key}": one of [${values.map(v => `"${v}"`).join(', ')}]`)
    .join(',\n');

  return `Analyze this ad image. Classify it across exactly 12 dimensions.
Pick EXACTLY ONE value per dimension.
Return ONLY a JSON object with no markdown, no explanation.

{
${dimensionLines}
}`;
}
