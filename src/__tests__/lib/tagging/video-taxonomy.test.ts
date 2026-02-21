import { describe, it, expect } from 'vitest';
import {
  VIDEO_TAXONOMY_DIMENSIONS,
  VIDEO_DIMENSION_KEYS,
  validateVideoTagSet,
  buildVideoTaggingPrompt,
  getDurationBucket,
  SCRIPT_STRUCTURE_VALUES,
  VERBAL_HOOK_TYPE_VALUES,
  PACING_VALUES,
  AUDIO_STYLE_VALUES,
  VIDEO_DURATION_BUCKET_VALUES,
  NARRATIVE_ARC_VALUES,
  OPENING_FRAME_VALUES,
} from '@/lib/tagging/video-taxonomy';

const VALID_VIDEO_TAG_SET = {
  script_structure: 'problem_solution',
  verbal_hook_type: 'question',
  pacing: 'fast_cut_under_3s',
  audio_style: 'voiceover',
  video_duration_bucket: 'under_15s',
  narrative_arc: 'problem_to_solution',
  opening_frame: 'human_face',
};

describe('video taxonomy', () => {
  it('has exactly 7 dimensions', () => {
    expect(VIDEO_DIMENSION_KEYS).toHaveLength(7);
  });

  it('every dimension has at least 2 values', () => {
    for (const [key, values] of Object.entries(VIDEO_TAXONOMY_DIMENSIONS)) {
      expect(values.length, `${key} should have >= 2 values`).toBeGreaterThanOrEqual(2);
    }
  });

  it('no duplicate values within any dimension', () => {
    for (const [key, values] of Object.entries(VIDEO_TAXONOMY_DIMENSIONS)) {
      const unique = new Set(values);
      expect(unique.size, `${key} has duplicate values`).toBe(values.length);
    }
  });

  it('all value arrays are exported and match VIDEO_TAXONOMY_DIMENSIONS', () => {
    const allArrays = [
      SCRIPT_STRUCTURE_VALUES,
      VERBAL_HOOK_TYPE_VALUES,
      PACING_VALUES,
      AUDIO_STYLE_VALUES,
      VIDEO_DURATION_BUCKET_VALUES,
      NARRATIVE_ARC_VALUES,
      OPENING_FRAME_VALUES,
    ];
    const dimensionArrays = Object.values(VIDEO_TAXONOMY_DIMENSIONS);
    expect(allArrays).toEqual(dimensionArrays);
  });
});

describe('validateVideoTagSet', () => {
  it('accepts a valid complete tag set', () => {
    const result = validateVideoTagSet(VALID_VIDEO_TAG_SET);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects null', () => {
    const result = validateVideoTagSet(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tags must be a non-null object');
  });

  it('rejects an array', () => {
    const result = validateVideoTagSet([]);
    expect(result.valid).toBe(false);
  });

  it('rejects a missing dimension', () => {
    const { script_structure: _, ...partial } = VALID_VIDEO_TAG_SET;
    const result = validateVideoTagSet(partial);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Missing dimension: script_structure');
  });

  it('rejects an invalid value', () => {
    const result = validateVideoTagSet({ ...VALID_VIDEO_TAG_SET, pacing: 'not_real' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid value for pacing');
  });

  it('collects multiple errors', () => {
    const { script_structure: _, verbal_hook_type: __, ...partial } = VALID_VIDEO_TAG_SET;
    const result = validateVideoTagSet(partial);
    expect(result.errors).toHaveLength(2);
  });
});

describe('buildVideoTaggingPrompt', () => {
  it('includes all classifiable dimension names (excludes video_duration_bucket)', () => {
    const prompt = buildVideoTaggingPrompt('test transcript', 'format_type: static_image');
    for (const key of VIDEO_DIMENSION_KEYS) {
      if (key === 'video_duration_bucket') continue;
      expect(prompt).toContain(`"${key}"`);
    }
  });

  it('does not include video_duration_bucket in prompt (calculated from metadata)', () => {
    const prompt = buildVideoTaggingPrompt('test transcript', 'format_type: static_image');
    expect(prompt).not.toContain('"video_duration_bucket"');
  });

  it('includes transcript text', () => {
    const prompt = buildVideoTaggingPrompt('Buy our amazing product now', 'format_type: static_image');
    expect(prompt).toContain('Buy our amazing product now');
  });

  it('includes hook tags summary', () => {
    const prompt = buildVideoTaggingPrompt('transcript', 'format_type: ugc_talking_head, human_presence: full_face');
    expect(prompt).toContain('format_type: ugc_talking_head');
  });

  it('handles empty transcript', () => {
    const prompt = buildVideoTaggingPrompt('', 'format_type: static_image');
    expect(prompt).toContain('No speech detected');
  });

  it('instructs JSON-only output', () => {
    const prompt = buildVideoTaggingPrompt('test', 'test');
    expect(prompt).toContain('ONLY a JSON object');
    expect(prompt).toContain('no markdown');
  });
});

describe('getDurationBucket', () => {
  it('returns under_15s for short videos', () => {
    expect(getDurationBucket(5)).toBe('under_15s');
    expect(getDurationBucket(14.9)).toBe('under_15s');
  });

  it('returns 15_to_30s for medium videos', () => {
    expect(getDurationBucket(15)).toBe('15_to_30s');
    expect(getDurationBucket(29.9)).toBe('15_to_30s');
  });

  it('returns 30_to_60s for longer videos', () => {
    expect(getDurationBucket(30)).toBe('30_to_60s');
    expect(getDurationBucket(59.9)).toBe('30_to_60s');
  });

  it('returns over_60s for long videos', () => {
    expect(getDurationBucket(60)).toBe('over_60s');
    expect(getDurationBucket(120)).toBe('over_60s');
  });
});
