import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockTagAdImage, mockFromCalls } = vi.hoisted(() => {
  const mockTagAdImage = vi.fn();

  // Track .from() calls and return different chain mocks based on table + method sequence
  const mockFromCalls: Array<{ table: string; result: unknown }> = [];

  return { mockTagAdImage, mockFromCalls };
});

vi.mock('@/lib/tagging/vision', () => ({
  tagAdImage: mockTagAdImage,
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const makeChain = (): Record<string, unknown> => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {};
        const self = () => chain;
        chain.select = vi.fn().mockImplementation(self);
        chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.update = vi.fn().mockImplementation(self);
        chain.eq = vi.fn().mockImplementation(self);
        chain.in = vi.fn().mockImplementation(self);
        chain.gte = vi.fn().mockImplementation(self);
        chain.lt = vi.fn().mockImplementation(self);
        chain.not = vi.fn().mockImplementation(self);
        chain.order = vi.fn().mockImplementation(self);
        chain.limit = vi.fn().mockImplementation(() => {
          const entry = mockFromCalls.shift();
          if (entry && entry.table === table) {
            return Promise.resolve(entry.result);
          }
          return Promise.resolve({ data: [], error: null });
        });
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
        return chain;
      };
      return makeChain();
    },
  }),
}));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(16)),
}));

import { runTaggingPipeline } from '@/lib/tagging/pipeline';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

describe('runTaggingPipeline', () => {
  it('returns zero stats when no untagged ads found', async () => {
    // ads query returns empty
    mockFromCalls.push({ table: 'ads', result: { data: [], error: null } });

    const stats = await runTaggingPipeline();

    expect(stats.total).toBe(0);
    expect(stats.tagged).toBe(0);
    expect(stats.deduped).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('tags untagged ads via vision API', async () => {
    // 1st: untagged ads query
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{ id: 'ad-1', thumbnail_url: 'https://example.com/img.jpg', image_hash: null, tagging_retry_count: 0 }],
        error: null,
      },
    });

    mockTagAdImage.mockResolvedValue({
      tags: {
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
      },
      inputTokens: 1000,
      outputTokens: 200,
      estimatedCostUsd: 0.006,
      durationMs: 500,
    });

    const stats = await runTaggingPipeline();

    expect(stats.total).toBe(1);
    expect(stats.tagged).toBe(1);
    expect(mockTagAdImage).toHaveBeenCalledWith('https://example.com/img.jpg');
  });

  it('increments retry count on failure', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{ id: 'ad-fail', thumbnail_url: 'https://example.com/img.jpg', image_hash: 'abc123', tagging_retry_count: 0 }],
        error: null,
      },
    });

    mockTagAdImage.mockResolvedValue({
      inputTokens: 500,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: 100,
      error: 'Failed to parse JSON response',
    });

    const stats = await runTaggingPipeline();

    expect(stats.failed).toBe(1);
    expect(stats.tagged).toBe(0);
  });

  it('marks as skipped after MAX_RETRIES', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{ id: 'ad-skip', thumbnail_url: 'https://example.com/img.jpg', image_hash: 'abc', tagging_retry_count: 2 }],
        error: null,
      },
    });

    mockTagAdImage.mockResolvedValue({
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: 100,
      error: 'Some error',
    });

    const stats = await runTaggingPipeline();

    expect(stats.skipped).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('returns zero stats on query error', async () => {
    mockFromCalls.push({ table: 'ads', result: { data: null, error: { message: 'DB error' } } });

    const stats = await runTaggingPipeline();

    expect(stats.total).toBe(0);
  });
});
