import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFromCalls } = vi.hoisted(() => {
  const mockFromCalls: Array<{ table: string; result: unknown }> = [];
  return { mockFromCalls };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const makeChain = (): Record<string, unknown> => {
        const chain: Record<string, ReturnType<typeof vi.fn>> = {};
        const self = () => chain;
        chain.select = vi.fn().mockImplementation(() => {
          const entry = mockFromCalls.find(e => e.table === table);
          if (entry) {
            mockFromCalls.splice(mockFromCalls.indexOf(entry), 1);
            const resolveChain: Record<string, unknown> = {};
            const resolveSelf = () => resolveChain;
            resolveChain.eq = vi.fn().mockImplementation(resolveSelf);
            resolveChain.in = vi.fn().mockImplementation(resolveSelf);
            resolveChain.gte = vi.fn().mockImplementation(resolveSelf);
            resolveChain.lt = vi.fn().mockImplementation(resolveSelf);
            resolveChain.not = vi.fn().mockImplementation(resolveSelf);
            resolveChain.order = vi.fn().mockImplementation(resolveSelf);
            resolveChain.limit = vi.fn().mockImplementation(resolveSelf);
            resolveChain.single = vi.fn().mockImplementation(() => {
              return Promise.resolve(entry.result);
            });
            resolveChain.then = (resolve: (v: unknown) => void) => {
              resolve(entry.result);
              return Promise.resolve(entry.result);
            };
            return resolveChain;
          }
          return chain;
        });
        chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.update = vi.fn().mockImplementation(self);
        chain.eq = vi.fn().mockImplementation(self);
        chain.in = vi.fn().mockImplementation(self);
        chain.gte = vi.fn().mockImplementation(self);
        chain.lt = vi.fn().mockImplementation(self);
        chain.not = vi.fn().mockImplementation(self);
        chain.order = vi.fn().mockImplementation(self);
        chain.limit = vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null }));
        chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
        return chain;
      };
      return makeChain();
    },
  }),
}));

import {
  calculateWeightedPrevalence,
  calculateVelocity,
  detectTrackDivergences,
  analyzeCreativeVelocity,
} from '@/lib/analysis/creative-velocity';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

// Helper to build a minimal tagged ad
function makeAd(overrides: {
  id?: string;
  signal_strength?: number;
  competitor_track?: string;
  is_video?: boolean;
  tags?: Record<string, string | null>;
  videoTags?: Record<string, string | null>;
}) {
  return {
    id: overrides.id || 'ad-1',
    competitor_id: 'comp-1',
    signal_strength: overrides.signal_strength ?? 50,
    competitor_track: overrides.competitor_track ?? 'consolidator',
    launch_date: '2025-01-15',
    is_video: overrides.is_video ?? false,
    tags: overrides.tags || { format_type: 'static_image', hook_type_visual: 'bold_claim', human_presence: 'full_face', text_overlay_density: 'moderate', text_overlay_position: 'center', color_temperature: 'warm', background_style: 'studio', product_visibility: 'hero_center', cta_visual_style: 'button', visual_composition: 'centered_single', brand_element_presence: 'logo_visible', emotion_energy_level: 'calm_aspirational' },
    videoTags: overrides.videoTags || {},
  };
}

describe('calculateWeightedPrevalence', () => {
  it('returns empty object for empty ads', () => {
    const result = calculateWeightedPrevalence([], 'all');
    expect(result).toEqual({});
  });

  it('gives full prevalence to a single ad with one tag value', () => {
    const ads = [makeAd({ signal_strength: 100 })];
    const result = calculateWeightedPrevalence(ads, 'all');

    expect(result.format_type.static_image).toBe(1);
    expect(result.format_type.ugc_talking_head).toBe(0);
  });

  it('weights by signal_strength', () => {
    const ads = [
      makeAd({ id: 'a1', signal_strength: 90, tags: { ...makeAd({}).tags, format_type: 'static_image' } }),
      makeAd({ id: 'a2', signal_strength: 10, tags: { ...makeAd({}).tags, format_type: 'ugc_talking_head' } }),
    ];
    const result = calculateWeightedPrevalence(ads, 'all');

    expect(result.format_type.static_image).toBeCloseTo(0.9, 1);
    expect(result.format_type.ugc_talking_head).toBeCloseTo(0.1, 1);
  });

  it('filters by track when specified', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_track: 'consolidator', signal_strength: 50 }),
      makeAd({ id: 'a2', competitor_track: 'velocity_tester', signal_strength: 50, tags: { ...makeAd({}).tags, format_type: 'ugc_talking_head' } }),
    ];

    const consResult = calculateWeightedPrevalence(ads, 'consolidator');
    expect(consResult.format_type.static_image).toBe(1);
    expect(consResult.format_type.ugc_talking_head).toBe(0);

    const vtResult = calculateWeightedPrevalence(ads, 'velocity_tester');
    expect(vtResult.format_type.ugc_talking_head).toBe(1);
    expect(vtResult.format_type.static_image).toBe(0);
  });

  it('handles video tags for video ads', () => {
    const ads = [
      makeAd({
        is_video: true,
        videoTags: { script_structure: 'problem_solution', verbal_hook_type: 'question', pacing: 'fast_cut_under_3s', audio_style: 'voiceover', video_duration_bucket: 'under_15s', narrative_arc: 'problem_to_solution', opening_frame: 'human_face' },
      }),
    ];
    const result = calculateWeightedPrevalence(ads, 'all');

    expect(result.script_structure.problem_solution).toBe(1);
    expect(result.pacing.fast_cut_under_3s).toBe(1);
  });
});

describe('calculateVelocity', () => {
  it('returns stable when no change', () => {
    const current = { format_type: { static_image: 0.5, ugc_talking_head: 0.5 } };
    const previous = { format_type: { static_image: 0.5, ugc_talking_head: 0.5 } };

    const result = calculateVelocity(current, previous);
    const staticImage = result.find(v => v.value === 'static_image')!;

    expect(staticImage.velocityPercent).toBe(0);
    expect(staticImage.direction).toBe('stable');
  });

  it('detects accelerating elements', () => {
    const current = { format_type: { ugc_talking_head: 0.7 } };
    const previous = { format_type: { ugc_talking_head: 0.3 } };

    const result = calculateVelocity(current, previous);
    const ugc = result.find(v => v.value === 'ugc_talking_head')!;

    expect(ugc.velocityPercent).toBeGreaterThan(1);
    expect(ugc.direction).toBe('accelerating');
  });

  it('detects declining elements', () => {
    const current = { format_type: { static_image: 0.2 } };
    const previous = { format_type: { static_image: 0.6 } };

    const result = calculateVelocity(current, previous);
    const si = result.find(v => v.value === 'static_image')!;

    expect(si.velocityPercent).toBeLessThan(-0.3);
    expect(si.direction).toBe('declining');
  });

  it('handles new element appearing (previous was 0)', () => {
    const current = { format_type: { ugc_talking_head: 0.3 } };
    const previous = { format_type: { ugc_talking_head: 0 } };

    const result = calculateVelocity(current, previous);
    const ugc = result.find(v => v.value === 'ugc_talking_head')!;

    expect(ugc.velocityPercent).toBe(1);
    expect(ugc.direction).toBe('accelerating');
  });

  it('handles element disappearing (current near 0)', () => {
    const current = { format_type: { static_image: 0.005 } };
    const previous = { format_type: { static_image: 0.5 } };

    const result = calculateVelocity(current, previous);
    const si = result.find(v => v.value === 'static_image')!;

    expect(si.direction).toBe('declining');
  });
});

describe('detectTrackDivergences', () => {
  it('detects divergence when tracks have different prevalence', () => {
    const cons = { format_type: { static_image: 0.8, ugc_talking_head: 0.2 } };
    const vt = { format_type: { static_image: 0.3, ugc_talking_head: 0.7 } };

    const result = detectTrackDivergences(cons, vt);

    expect(result.length).toBeGreaterThanOrEqual(1);

    const staticDiv = result.find(d => d.value === 'static_image');
    expect(staticDiv).toBeDefined();
    expect(staticDiv!.direction).toBe('consolidators_leading');

    const ugcDiv = result.find(d => d.value === 'ugc_talking_head');
    expect(ugcDiv).toBeDefined();
    expect(ugcDiv!.direction).toBe('velocity_testers_leading');
  });

  it('returns empty when tracks are aligned', () => {
    const cons = { format_type: { static_image: 0.5 } };
    const vt = { format_type: { static_image: 0.5 } };

    const result = detectTrackDivergences(cons, vt);
    expect(result).toHaveLength(0);
  });

  it('respects custom threshold', () => {
    const cons = { format_type: { static_image: 0.5 } };
    const vt = { format_type: { static_image: 0.6 } };

    const resultDefault = detectTrackDivergences(cons, vt, 0.15);
    expect(resultDefault).toHaveLength(0);

    const resultLow = detectTrackDivergences(cons, vt, 0.05);
    expect(resultLow).toHaveLength(1);
  });

  it('sorts by absolute divergence descending', () => {
    const cons = { format_type: { static_image: 0.2, ugc_talking_head: 0.8 } };
    const vt = { format_type: { static_image: 0.8, ugc_talking_head: 0.1 } };

    const result = detectTrackDivergences(cons, vt);
    // ugc_talking_head has bigger abs divergence (0.7) than static_image (0.6)
    expect(Math.abs(result[0].divergencePercent)).toBeGreaterThanOrEqual(Math.abs(result[1].divergencePercent));
  });
});

describe('analyzeCreativeVelocity', () => {
  it('returns null when brand not found', async () => {
    mockFromCalls.push({ table: 'client_brands', result: { data: null, error: null } });

    const result = await analyzeCreativeVelocity('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when no competitors found', async () => {
    mockFromCalls.push({ table: 'client_brands', result: { data: { id: 'b1', name: 'TestBrand' }, error: null } });
    mockFromCalls.push({ table: 'competitors', result: { data: [], error: null } });

    const result = await analyzeCreativeVelocity('b1');
    expect(result).toBeNull();
  });

  it('returns structured analysis with all expected fields', async () => {
    const today = new Date().toISOString().split('T')[0];

    mockFromCalls.push({ table: 'client_brands', result: { data: { id: 'b1', name: 'Devlyn' }, error: null } });
    mockFromCalls.push({ table: 'competitors', result: { data: [{ id: 'c1' }, { id: 'c2' }], error: null } });
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [
          { id: 'a1', competitor_id: 'c1', signal_strength: 80, competitor_track: 'consolidator', launch_date: today, is_video: false },
          { id: 'a2', competitor_id: 'c2', signal_strength: 60, competitor_track: 'velocity_tester', launch_date: today, is_video: false },
        ],
        error: null,
      },
    });
    mockFromCalls.push({
      table: 'creative_tags',
      result: {
        data: [
          { ad_id: 'a1', format_type: 'static_image', hook_type_visual: 'bold_claim', human_presence: 'full_face', text_overlay_density: 'moderate', text_overlay_position: 'center', color_temperature: 'warm', background_style: 'studio', product_visibility: 'hero_center', cta_visual_style: 'button', visual_composition: 'centered_single', brand_element_presence: 'logo_visible', emotion_energy_level: 'calm_aspirational' },
          { ad_id: 'a2', format_type: 'ugc_talking_head', hook_type_visual: 'question', human_presence: 'full_face', text_overlay_density: 'none', text_overlay_position: 'none', color_temperature: 'neutral', background_style: 'real_environment', product_visibility: 'not_visible', cta_visual_style: 'none', visual_composition: 'centered_single', brand_element_presence: 'neither', emotion_energy_level: 'emotional_storytelling' },
        ],
        error: null,
      },
    });

    const result = await analyzeCreativeVelocity('b1');

    expect(result).not.toBeNull();
    expect(result!.competitiveSet).toBe('Devlyn Competitors');
    expect(result!.brandId).toBe('b1');
    expect(result!.period).toBe('90d');
    expect(result!.topAccelerating).toBeDefined();
    expect(result!.topDeclining).toBeDefined();
    expect(result!.fullDimensionBreakdown).toBeDefined();
    expect(result!.trackDivergences).toBeDefined();
    expect(result!.fullDimensionBreakdown.format_type).toBeDefined();
  });
});
