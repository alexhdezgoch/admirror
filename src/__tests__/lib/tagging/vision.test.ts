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

import { tagAdImage } from '@/lib/tagging/vision';

const VALID_TAGS = {
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

const mockFetchResponse = (ok: boolean, contentType = 'image/jpeg') => {
  return {
    ok,
    headers: { get: () => contentType },
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(true)));
});

describe('tagAdImage', () => {
  it('returns valid tags from successful API response', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 1000, output_tokens: 200 },
      content: [{ type: 'text', text: JSON.stringify(VALID_TAGS) }],
    });

    const result = await tagAdImage('https://example.com/image.jpg');

    expect(result.tags).toEqual(VALID_TAGS);
    expect(result.error).toBeUndefined();
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(200);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('returns error on image fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFetchResponse(false)));

    const result = await tagAdImage('https://example.com/bad.jpg');

    expect(result.tags).toBeUndefined();
    expect(result.error).toBe('Failed to fetch image');
  });

  it('returns error on JSON parse failure', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: 'not json at all' }],
    });

    const result = await tagAdImage('https://example.com/image.jpg');

    expect(result.tags).toBeUndefined();
    expect(result.error).toBe('Failed to parse JSON response');
  });

  it('returns error on validation failure (valid JSON, invalid values)', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: JSON.stringify({ ...VALID_TAGS, format_type: 'invalid_value' }) }],
    });

    const result = await tagAdImage('https://example.com/image.jpg');

    expect(result.tags).toBeUndefined();
    expect(result.error).toContain('Validation failed');
  });

  it('detects rate limit errors', async () => {
    mockAnthropicCreate.mockRejectedValue(new MockRateLimitError());

    const result = await tagAdImage('https://example.com/image.jpg');

    expect(result.error).toBe('RATE_LIMITED');
  });

  it('calculates cost accurately', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 1_000_000, output_tokens: 100_000 },
      content: [{ type: 'text', text: JSON.stringify(VALID_TAGS) }],
    });

    const result = await tagAdImage('https://example.com/image.jpg');

    // input: 1M * $3/M = $3, output: 100K * $15/M = $1.5, total = $4.5
    expect(result.estimatedCostUsd).toBe(4.5);
  });

  it('strips markdown code blocks from response', async () => {
    mockAnthropicCreate.mockResolvedValue({
      usage: { input_tokens: 500, output_tokens: 100 },
      content: [{ type: 'text', text: '```json\n' + JSON.stringify(VALID_TAGS) + '\n```' }],
    });

    const result = await tagAdImage('https://example.com/image.jpg');

    expect(result.tags).toEqual(VALID_TAGS);
  });
});
