import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAnthropicCreate, MockRateLimitError } = vi.hoisted(() => {
  const mockAnthropicCreate = vi.fn();

  class MockRateLimitError extends Error {
    constructor() {
      super('Rate limited');
      this.name = 'RateLimitError';
    }
  }

  return { mockAnthropicCreate, MockRateLimitError };
});

vi.mock('@anthropic-ai/sdk', () => {
  class Anthropic {
    messages = { create: mockAnthropicCreate };
    static RateLimitError = MockRateLimitError;
  }

  return { default: Anthropic };
});

import { tagHookFrame, detectVisualShifts, tagVideoContent } from '@/lib/tagging/video-vision';

const VALID_HOOK_TAGS = {
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

const VALID_VIDEO_TAGS = {
  script_structure: 'problem_solution',
  verbal_hook_type: 'question',
  pacing: 'fast_cut_under_3s',
  audio_style: 'voiceover',
  narrative_arc: 'problem_to_solution',
  opening_frame: 'human_face',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('tagHookFrame', () => {
  it('returns valid 12D tags from successful API response', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 1000, output_tokens: 200 },
      content: [{ type: 'text', text: JSON.stringify(VALID_HOOK_TAGS) }],
    });

    const result = await tagHookFrame(Buffer.from('fake-image'));

    expect(result.tags).toEqual(VALID_HOOK_TAGS);
    expect(result.error).toBeUndefined();
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(200);
  });

  it('returns error on JSON parse failure', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: 'not json' }],
    });

    const result = await tagHookFrame(Buffer.from('fake-image'));

    expect(result.tags).toBeUndefined();
    expect(result.error).toBe('Failed to parse JSON response');
  });

  it('returns error on validation failure', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: JSON.stringify({ ...VALID_HOOK_TAGS, format_type: 'invalid' }) }],
    });

    const result = await tagHookFrame(Buffer.from('fake-image'));

    expect(result.tags).toBeUndefined();
    expect(result.error).toContain('Validation failed');
  });

  it('detects rate limit errors', async () => {
    mockAnthropicCreate.mockRejectedValue(new MockRateLimitError());

    const result = await tagHookFrame(Buffer.from('fake-image'));

    expect(result.error).toBe('RATE_LIMITED');
  });

  it('strips markdown code blocks', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(VALID_HOOK_TAGS) + '\n```' }],
    });

    const result = await tagHookFrame(Buffer.from('fake-image'));

    expect(result.tags).toEqual(VALID_HOOK_TAGS);
  });
});

describe('detectVisualShifts', () => {
  it('identifies visual changes between frames', async () => {
    mockAnthropicCreate
      .mockResolvedValueOnce({
        usage: { input_tokens: 2000, output_tokens: 50 },
        content: [{ type: 'text', text: JSON.stringify({ changed: true, description: 'Scene change from person to product' }) }],
      })
      .mockResolvedValueOnce({
        usage: { input_tokens: 2000, output_tokens: 50 },
        content: [{ type: 'text', text: JSON.stringify({ changed: false }) }],
      });

    const frames = [Buffer.from('f1'), Buffer.from('f2'), Buffer.from('f3')];
    const result = await detectVisualShifts(frames);

    expect(result.shifts).toHaveLength(1);
    expect(result.shifts[0].frameIndex).toBe(1);
    expect(result.shifts[0].description).toContain('Scene change');
    expect(result.totalInputTokens).toBe(4000);
    expect(result.totalOutputTokens).toBe(100);
  });

  it('returns empty shifts when no changes detected', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 2000, output_tokens: 50 },
      content: [{ type: 'text', text: JSON.stringify({ changed: false }) }],
    });

    const frames = [Buffer.from('f1'), Buffer.from('f2')];
    const result = await detectVisualShifts(frames);

    expect(result.shifts).toHaveLength(0);
  });

  it('calculates cost across all comparisons', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 1_000_000, output_tokens: 100 },
      content: [{ type: 'text', text: JSON.stringify({ changed: false }) }],
    });

    const frames = [Buffer.from('f1'), Buffer.from('f2')];
    const result = await detectVisualShifts(frames);

    // 1M input * $3/M = $3, 100 output * $15/M = $0.0015
    expect(result.totalCostUsd).toBeCloseTo(3.0015, 4);
  });

  it('stops on rate limit', async () => {
    mockAnthropicCreate
      .mockResolvedValueOnce({
        usage: { input_tokens: 100, output_tokens: 50 },
        content: [{ type: 'text', text: JSON.stringify({ changed: false }) }],
      })
      .mockRejectedValueOnce(new MockRateLimitError());

    const frames = [Buffer.from('f1'), Buffer.from('f2'), Buffer.from('f3'), Buffer.from('f4')];
    const result = await detectVisualShifts(frames);

    // Should have processed first pair, stopped at second due to rate limit
    expect(mockAnthropicCreate).toHaveBeenCalledTimes(2);
    expect(result.shifts).toHaveLength(0);
  });
});

describe('tagVideoContent', () => {
  it('returns valid 7D video tags', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 150 },
      content: [{ type: 'text', text: JSON.stringify(VALID_VIDEO_TAGS) }],
    });

    const hookTags = VALID_HOOK_TAGS as Parameters<typeof tagVideoContent>[1];
    const result = await tagVideoContent('Buy our product', hookTags, 25);

    expect(result.tags).toBeDefined();
    expect(result.tags!.script_structure).toBe('problem_solution');
    expect(result.tags!.video_duration_bucket).toBe('15_to_30s');
    expect(result.error).toBeUndefined();
  });

  it('adds calculated duration bucket', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 150 },
      content: [{ type: 'text', text: JSON.stringify(VALID_VIDEO_TAGS) }],
    });

    const hookTags = VALID_HOOK_TAGS as Parameters<typeof tagVideoContent>[1];
    const result = await tagVideoContent('transcript', hookTags, 45);

    expect(result.tags!.video_duration_bucket).toBe('30_to_60s');
  });

  it('returns error on parse failure', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 50 },
      content: [{ type: 'text', text: 'invalid json' }],
    });

    const hookTags = VALID_HOOK_TAGS as Parameters<typeof tagVideoContent>[1];
    const result = await tagVideoContent('transcript', hookTags, 10);

    expect(result.tags).toBeUndefined();
    expect(result.error).toBe('Failed to parse JSON response');
  });

  it('detects rate limit errors', async () => {
    mockAnthropicCreate.mockRejectedValue(new MockRateLimitError());

    const hookTags = VALID_HOOK_TAGS as Parameters<typeof tagVideoContent>[1];
    const result = await tagVideoContent('transcript', hookTags, 10);

    expect(result.error).toBe('RATE_LIMITED');
  });
});
