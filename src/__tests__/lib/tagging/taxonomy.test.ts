import { describe, it, expect } from 'vitest';
import {
  TAXONOMY_DIMENSIONS,
  DIMENSION_KEYS,
  validateTagSet,
  buildTaggingPrompt,
  FORMAT_TYPE_VALUES,
  HOOK_TYPE_VISUAL_VALUES,
  HUMAN_PRESENCE_VALUES,
  TEXT_OVERLAY_DENSITY_VALUES,
  TEXT_OVERLAY_POSITION_VALUES,
  COLOR_TEMPERATURE_VALUES,
  BACKGROUND_STYLE_VALUES,
  PRODUCT_VISIBILITY_VALUES,
  CTA_VISUAL_STYLE_VALUES,
  VISUAL_COMPOSITION_VALUES,
  BRAND_ELEMENT_PRESENCE_VALUES,
  EMOTION_ENERGY_LEVEL_VALUES,
} from '@/lib/tagging/taxonomy';

const VALID_TAG_SET = {
  format_type: 'static_image',
  hook_type_visual: 'bold_claim',
  human_presence: 'full_face',
  text_overlay_density: 'moderate',
  text_overlay_position: 'center',
  color_temperature: 'warm',
  background_style: 'studio',
  product_visibility: 'hero_center',
  cta_visual_style: 'button',
  visual_composition: 'centered_single',
  brand_element_presence: 'logo_visible',
  emotion_energy_level: 'calm_aspirational',
};

describe('taxonomy', () => {
  it('has exactly 12 dimensions', () => {
    expect(DIMENSION_KEYS).toHaveLength(12);
  });

  it('every dimension has at least 2 values', () => {
    for (const [key, values] of Object.entries(TAXONOMY_DIMENSIONS)) {
      expect(values.length, `${key} should have >= 2 values`).toBeGreaterThanOrEqual(2);
    }
  });

  it('no duplicate values within any dimension', () => {
    for (const [key, values] of Object.entries(TAXONOMY_DIMENSIONS)) {
      const unique = new Set(values);
      expect(unique.size, `${key} has duplicate values`).toBe(values.length);
    }
  });

  it('all value arrays are exported and match TAXONOMY_DIMENSIONS', () => {
    const allArrays = [
      FORMAT_TYPE_VALUES,
      HOOK_TYPE_VISUAL_VALUES,
      HUMAN_PRESENCE_VALUES,
      TEXT_OVERLAY_DENSITY_VALUES,
      TEXT_OVERLAY_POSITION_VALUES,
      COLOR_TEMPERATURE_VALUES,
      BACKGROUND_STYLE_VALUES,
      PRODUCT_VISIBILITY_VALUES,
      CTA_VISUAL_STYLE_VALUES,
      VISUAL_COMPOSITION_VALUES,
      BRAND_ELEMENT_PRESENCE_VALUES,
      EMOTION_ENERGY_LEVEL_VALUES,
    ];
    const dimensionArrays = Object.values(TAXONOMY_DIMENSIONS);
    expect(allArrays).toEqual(dimensionArrays);
  });
});

describe('validateTagSet', () => {
  it('accepts a valid complete tag set', () => {
    const result = validateTagSet(VALID_TAG_SET);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateTagSet(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tags must be a non-null object');
  });

  it('rejects an array', () => {
    const result = validateTagSet([]);
    expect(result.valid).toBe(false);
  });

  it('rejects a missing dimension', () => {
    const { format_type: _, ...partial } = VALID_TAG_SET;
    const result = validateTagSet(partial);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Missing dimension: format_type');
  });

  it('rejects an invalid value', () => {
    const result = validateTagSet({ ...VALID_TAG_SET, format_type: 'not_real' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid value for format_type');
  });

  it('collects multiple errors', () => {
    const { format_type: _, hook_type_visual: __, ...partial } = VALID_TAG_SET;
    const result = validateTagSet(partial);
    expect(result.errors).toHaveLength(2);
  });
});

describe('buildTaggingPrompt', () => {
  it('includes all dimension names', () => {
    const prompt = buildTaggingPrompt();
    for (const key of DIMENSION_KEYS) {
      expect(prompt).toContain(`"${key}"`);
    }
  });

  it('includes all values for each dimension', () => {
    const prompt = buildTaggingPrompt();
    for (const values of Object.values(TAXONOMY_DIMENSIONS)) {
      for (const value of values) {
        expect(prompt).toContain(`"${value}"`);
      }
    }
  });

  it('instructs JSON-only output', () => {
    const prompt = buildTaggingPrompt();
    expect(prompt).toContain('ONLY a JSON object');
    expect(prompt).toContain('no markdown');
  });
});
