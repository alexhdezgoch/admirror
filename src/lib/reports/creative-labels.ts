function snakeToTitleCase(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const DIMENSION_LABELS: Record<string, string> = {
  format_type: 'Format',
  hook_type_visual: 'Visual Hook',
  human_presence: 'Human Presence',
  text_overlay_density: 'Text Overlay',
  text_overlay_position: 'Text Position',
  color_temperature: 'Color Palette',
  background_style: 'Background',
  product_visibility: 'Product Visibility',
  cta_visual_style: 'CTA Style',
  visual_composition: 'Composition',
  brand_element_presence: 'Brand Elements',
  emotion_energy_level: 'Energy/Emotion',
  script_structure: 'Script Structure',
  verbal_hook_type: 'Verbal Hook',
  pacing: 'Pacing',
  audio_style: 'Audio',
  video_duration_bucket: 'Duration',
  narrative_arc: 'Narrative Arc',
  opening_frame: 'Opening Frame',
};

const VALUE_LABELS: Record<string, string> = {
  // Image taxonomy - format_type
  static_image: 'Static Images',
  ugc_talking_head: 'UGC Talking Head',
  product_demo: 'Product Demo',
  motion_graphics: 'Motion Graphics',
  lifestyle_photo: 'Lifestyle Photography',
  before_after: 'Before/After',
  carousel_card: 'Carousel Card',
  screenshot_testimonial: 'Screenshot Testimonial',

  // hook_type_visual
  problem_agitation: 'Problem Agitation',
  bold_claim: 'Bold Claim Hook',
  question: 'Question Hook',
  statistic: 'Statistic Hook',
  curiosity_gap: 'Curiosity Gap',
  social_proof: 'Social Proof',
  none: 'None',

  // human_presence
  full_face: 'Prominent Faces',
  partial_body: 'Partial Body Shots',
  hands_only: 'Hands Only',
  no_human: 'No People',
  crowd_multiple: 'Crowd/Multiple',

  // text_overlay_density
  minimal_headline_only: 'Minimal Headline Only',
  moderate: 'Moderate Text',
  heavy_text_dominant: 'Text-Heavy Layouts',

  // text_overlay_position
  top: 'Top',
  center: 'Center',
  bottom: 'Bottom',
  split_top_bottom: 'Split Top/Bottom Text',

  // color_temperature
  warm: 'Warm Color Palette',
  cool: 'Cool Tones',
  neutral: 'Neutral',
  high_contrast: 'High Contrast',
  muted: 'Muted Tones',

  // background_style
  solid_color: 'Solid Color',
  gradient: 'Gradient',
  real_environment: 'Real Environment',
  studio: 'Studio',
  blurred: 'Blurred',

  // product_visibility
  hero_center: 'Hero/Center Product',
  in_use: 'Product In Use',
  secondary: 'Secondary Product',
  not_visible: 'Not Visible',

  // cta_visual_style
  button: 'Button CTA',
  text_only: 'Text-Only CTA',
  overlay_banner: 'Overlay Banner',
  end_card: 'End Card',

  // visual_composition
  centered_single: 'Centered Single Subject',
  split_screen: 'Split Screen',
  grid_collage: 'Grid/Collage',
  full_bleed: 'Full Bleed Layout',
  framed: 'Framed',

  // brand_element_presence
  logo_visible: 'Logo Visible',
  brand_colors_dominant: 'Brand Colors Dominant',
  neither: 'No Brand Elements',
  both: 'Logo + Brand Colors',

  // emotion_energy_level
  calm_aspirational: 'Calm & Aspirational',
  urgent_high_energy: 'Urgent/High Energy',
  educational_neutral: 'Educational/Neutral',
  emotional_storytelling: 'Emotional Storytelling',
  humorous: 'Humorous',

  // Video taxonomy - script_structure
  problem_solution: 'Problem-Solution',
  testimonial_narrative: 'Testimonial Narrative',
  listicle_tips: 'Listicle/Tips',
  demonstration: 'Demonstration',
  story_arc: 'Story Arc',
  no_script_music_only: 'Music Only',

  // verbal_hook_type
  direct_address: 'Direct Address',
  pain_point: 'Pain Point',
  none_no_speech: 'No Speech',

  // pacing
  fast_cut_under_3s: 'Fast Cuts (<3s)',
  moderate_3_5s: 'Moderate (3-5s)',
  slow_single_shot: 'Slow/Single Shot',
  mixed: 'Mixed Pacing',

  // audio_style
  voiceover: 'Voiceover',
  direct_to_camera: 'Direct to Camera',
  music_only: 'Music Only',
  mixed_voice_and_music: 'Voice + Music',
  silent: 'Silent',

  // video_duration_bucket
  under_15s: 'Under 15s',
  '15_to_30s': '15-30s',
  '30_to_60s': '30-60s',
  over_60s: 'Over 60s',

  // narrative_arc
  single_scene: 'Single Scene',
  face_to_product: 'Face to Product',
  product_to_result: 'Product to Result',
  problem_to_solution: 'Problem to Solution',
  testimonial_to_cta: 'Testimonial to CTA',
  multi_scene_montage: 'Multi-Scene Montage',

  // opening_frame
  human_face: 'Human Face',
  text_hook: 'Text Hook',
  product_closeup: 'Product Close-Up',
  environment_scene: 'Environment Scene',
  brand_logo: 'Brand Logo',

  // Track values
  consolidator: 'Track A (Consolidators)',
  velocity_tester: 'Track B (Velocity Testers)',
};

export function formatDimensionLabel(dimension: string, value: string): string {
  const dimLabel = DIMENSION_LABELS[dimension] || snakeToTitleCase(dimension);
  const valLabel = VALUE_LABELS[value] || snakeToTitleCase(value);
  return `${dimLabel}: ${valLabel}`;
}

export function generateActionImplication(
  dimension: string,
  value: string,
  convergenceRatio: number
): string {
  const label = formatDimensionLabel(dimension, value);
  const pct = Math.round(convergenceRatio * 100);

  if (convergenceRatio >= 0.75) {
    return `${label} is approaching industry standard at ${pct}% adoption. Not using it risks looking out-of-touch.`;
  }
  if (convergenceRatio >= 0.5) {
    return `${label} is gaining traction with ${pct}% of competitors. Consider testing before it becomes table stakes.`;
  }
  return `${label} is emerging among ${pct}% of competitors. Early adoption could provide differentiation.`;
}

// eslint-disable-next-line no-misleading-character-class
const EMOJI_RE = new RegExp(
  '[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}' +
  '\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}' +
  '\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]',
  'gu'
);

export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
