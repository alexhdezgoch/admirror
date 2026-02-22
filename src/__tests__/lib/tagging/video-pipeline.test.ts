import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockExtractKeyframesAndAudio,
  mockCleanupTempFiles,
  mockTranscribeAudio,
  mockTagHookFrame,
  mockDetectVisualShifts,
  mockTagVideoContent,
  mockFromCalls,
} = vi.hoisted(() => {
  const mockExtractKeyframesAndAudio = vi.fn();
  const mockCleanupTempFiles = vi.fn();
  const mockTranscribeAudio = vi.fn();
  const mockTagHookFrame = vi.fn();
  const mockDetectVisualShifts = vi.fn();
  const mockTagVideoContent = vi.fn();
  const mockFromCalls: Array<{ table: string; result: unknown }> = [];

  return {
    mockExtractKeyframesAndAudio,
    mockCleanupTempFiles,
    mockTranscribeAudio,
    mockTagHookFrame,
    mockDetectVisualShifts,
    mockTagVideoContent,
    mockFromCalls,
  };
});

vi.mock('@/lib/tagging/ffmpeg', () => ({
  extractKeyframesAndAudio: mockExtractKeyframesAndAudio,
  cleanupTempFiles: mockCleanupTempFiles,
}));

vi.mock('@/lib/tagging/whisper', () => ({
  transcribeAudio: mockTranscribeAudio,
}));

vi.mock('@/lib/tagging/video-vision', () => ({
  tagHookFrame: mockTagHookFrame,
  detectVisualShifts: mockDetectVisualShifts,
  tagVideoContent: mockTagVideoContent,
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

import { runVideoTaggingPipeline } from '@/lib/tagging/video-pipeline';

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
  video_duration_bucket: 'under_15s',
  narrative_arc: 'problem_to_solution',
  opening_frame: 'human_face',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
  mockCleanupTempFiles.mockResolvedValue(undefined);
});

describe('runVideoTaggingPipeline', () => {
  it('returns zero stats when no untagged video ads found', async () => {
    mockFromCalls.push({ table: 'ads', result: { data: [], error: null } });

    const stats = await runVideoTaggingPipeline();

    expect(stats.total).toBe(0);
    expect(stats.tagged).toBe(0);
    expect(stats.failed).toBe(0);
  });

  it('processes video ad through full pipeline', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{
          id: 'vid-1',
          video_url: 'https://example.com/video.mp4',
          video_duration: 10,
          video_tagging_retry_count: 0,
        }],
        error: null,
      },
    });

    mockExtractKeyframesAndAudio.mockResolvedValue({
      frames: [Buffer.from('f1'), Buffer.from('f2'), Buffer.from('f3'), Buffer.from('f4'), Buffer.from('f5')],
      durationSeconds: 10,
      audioPath: '/tmp/video-tagging/vid-1.mp3',
    });

    mockTranscribeAudio.mockResolvedValue({
      transcript: 'Buy our amazing product',
      wordCount: 4,
      durationMs: 1000,
      audioSeconds: 10,
      estimatedCostUsd: 0.0001,
    });

    mockTagHookFrame.mockResolvedValue({
      tags: VALID_HOOK_TAGS,
      inputTokens: 1000,
      outputTokens: 200,
      estimatedCostUsd: 0.006,
      durationMs: 2000,
    });

    mockDetectVisualShifts.mockResolvedValue({
      shifts: [{ frameIndex: 2, description: 'Scene change' }],
      totalInputTokens: 8000,
      totalOutputTokens: 200,
      totalCostUsd: 0.027,
      durationMs: 8000,
    });

    mockTagVideoContent.mockResolvedValue({
      tags: VALID_VIDEO_TAGS,
      inputTokens: 500,
      outputTokens: 100,
      estimatedCostUsd: 0.003,
      durationMs: 1000,
    });

    const stats = await runVideoTaggingPipeline();

    expect(stats.total).toBe(1);
    expect(stats.tagged).toBe(1);
    expect(stats.failed).toBe(0);
    expect(stats.totalCostUsd).toBeGreaterThan(0);
    expect(mockExtractKeyframesAndAudio).toHaveBeenCalledWith('https://example.com/video.mp4', 'vid-1');
    expect(mockTranscribeAudio).toHaveBeenCalledWith('/tmp/video-tagging/vid-1.mp3');
    expect(mockTagHookFrame).toHaveBeenCalled();
    expect(mockDetectVisualShifts).toHaveBeenCalled();
    expect(mockTagVideoContent).toHaveBeenCalled();
    expect(mockCleanupTempFiles).toHaveBeenCalledWith('vid-1');
  });

  it('handles no-audio video gracefully', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{
          id: 'vid-silent',
          video_url: 'https://example.com/silent.mp4',
          video_duration: 8,
          video_tagging_retry_count: 0,
        }],
        error: null,
      },
    });

    mockExtractKeyframesAndAudio.mockResolvedValue({
      frames: [Buffer.from('f1'), Buffer.from('f2')],
      durationSeconds: 8,
      audioPath: null,
    });

    mockTagHookFrame.mockResolvedValue({
      tags: VALID_HOOK_TAGS,
      inputTokens: 1000,
      outputTokens: 200,
      estimatedCostUsd: 0.006,
      durationMs: 2000,
    });

    mockDetectVisualShifts.mockResolvedValue({
      shifts: [],
      totalInputTokens: 2000,
      totalOutputTokens: 50,
      totalCostUsd: 0.007,
      durationMs: 2000,
    });

    mockTagVideoContent.mockResolvedValue({
      tags: VALID_VIDEO_TAGS,
      inputTokens: 300,
      outputTokens: 100,
      estimatedCostUsd: 0.002,
      durationMs: 500,
    });

    const stats = await runVideoTaggingPipeline();

    expect(stats.tagged).toBe(1);
    expect(stats.noAudio).toBe(1);
    expect(mockTranscribeAudio).not.toHaveBeenCalled();
  });

  it('increments retry count on failure', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{
          id: 'vid-fail',
          video_url: 'https://example.com/bad.mp4',
          video_duration: 10,
          video_tagging_retry_count: 0,
        }],
        error: null,
      },
    });

    mockExtractKeyframesAndAudio.mockRejectedValue(new Error('Download failed'));

    const stats = await runVideoTaggingPipeline();

    expect(stats.failed).toBe(1);
    expect(stats.tagged).toBe(0);
  });

  it('marks as skipped after MAX_RETRIES', async () => {
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [{
          id: 'vid-skip',
          video_url: 'https://example.com/bad.mp4',
          video_duration: 10,
          video_tagging_retry_count: 2,
        }],
        error: null,
      },
    });

    mockExtractKeyframesAndAudio.mockRejectedValue(new Error('Download failed'));

    const stats = await runVideoTaggingPipeline();

    expect(stats.skipped).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it('returns zero stats on query error', async () => {
    mockFromCalls.push({ table: 'ads', result: { data: null, error: { message: 'DB error' } } });

    const stats = await runVideoTaggingPipeline();

    expect(stats.total).toBe(0);
  });
});
