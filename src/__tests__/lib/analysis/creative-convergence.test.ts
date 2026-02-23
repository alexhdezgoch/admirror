import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetchTaggedAds, mockFromCalls } = vi.hoisted(() => {
  const mockFetchTaggedAds = vi.fn();
  const mockFromCalls: Array<{ table: string; result: unknown }> = [];
  return { mockFetchTaggedAds, mockFromCalls };
});

vi.mock('@/lib/analysis/creative-velocity', () => ({
  fetchTaggedAds: mockFetchTaggedAds,
}));

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
            resolveChain.lt = vi.fn().mockImplementation(resolveSelf);
            resolveChain.order = vi.fn().mockImplementation(resolveSelf);
            resolveChain.then = (resolve: (v: unknown) => void) => {
              resolve(entry.result);
              return Promise.resolve(entry.result);
            };
            return resolveChain;
          }
          return chain;
        });
        chain.upsert = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.eq = vi.fn().mockImplementation(self);
        chain.lt = vi.fn().mockImplementation(self);
        chain.order = vi.fn().mockImplementation(self);
        return chain;
      };
      return makeChain();
    },
  }),
}));

import {
  classifyConvergence,
  calculateConfidence,
  calculateConvergence,
  analyzeCreativeConvergence,
} from '@/lib/analysis/creative-convergence';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

const today = new Date().toISOString().split('T')[0];
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const fiftyDaysAgo = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

interface TestAd {
  id: string;
  competitor_id: string;
  signal_strength: number;
  competitor_track: string | null;
  launch_date: string;
  is_video: boolean;
  tags: Record<string, string | null>;
  videoTags: Record<string, string | null>;
}

function makeAd(overrides: Partial<TestAd> & { id: string; competitor_id: string }): TestAd {
  return {
    signal_strength: 50,
    competitor_track: 'consolidator',
    launch_date: today,
    is_video: false,
    tags: {},
    videoTags: {},
    ...overrides,
  };
}

const COMPETITORS = [
  { id: 'c1', name: 'CompA', track: 'consolidator' as string | null },
  { id: 'c2', name: 'CompB', track: 'velocity_tester' as string | null },
  { id: 'c3', name: 'CompC', track: 'consolidator' as string | null },
];

describe('classifyConvergence', () => {
  it('returns STRONG_CONVERGENCE for high ratio with cross-track', () => {
    expect(classifyConvergence(0.7, true)).toBe('STRONG_CONVERGENCE');
  });

  it('returns MODERATE_CONVERGENCE for high ratio without cross-track', () => {
    expect(classifyConvergence(0.7, false)).toBe('MODERATE_CONVERGENCE');
  });

  it('returns EMERGING_PATTERN for medium ratio', () => {
    expect(classifyConvergence(0.5, false)).toBe('EMERGING_PATTERN');
  });

  it('returns NO_CONVERGENCE for low ratio', () => {
    expect(classifyConvergence(0.3, false)).toBe('NO_CONVERGENCE');
  });

  it('threshold at 0.6 for MODERATE', () => {
    expect(classifyConvergence(0.6, false)).toBe('MODERATE_CONVERGENCE');
    expect(classifyConvergence(0.59, false)).toBe('EMERGING_PATTERN');
  });

  it('threshold at 0.4 for EMERGING', () => {
    expect(classifyConvergence(0.4, false)).toBe('EMERGING_PATTERN');
    expect(classifyConvergence(0.39, false)).toBe('NO_CONVERGENCE');
  });
});

describe('calculateConfidence', () => {
  it('returns 0 for 0 competitors', () => {
    expect(calculateConfidence(0)).toBe(0);
  });

  it('returns low confidence for small sets', () => {
    expect(calculateConfidence(3)).toBeLessThan(0.6);
    expect(calculateConfidence(3)).toBeGreaterThan(0);
  });

  it('returns moderate confidence for medium sets', () => {
    const c5 = calculateConfidence(5);
    expect(c5).toBeGreaterThan(0.7);
    expect(c5).toBeLessThan(0.8);
  });

  it('caps at 1.0 for large sets', () => {
    expect(calculateConfidence(10)).toBe(1);
    expect(calculateConfidence(20)).toBe(1);
  });

  it('increases monotonically', () => {
    const c3 = calculateConfidence(3);
    const c5 = calculateConfidence(5);
    const c8 = calculateConfidence(8);
    expect(c5).toBeGreaterThan(c3);
    expect(c8).toBeGreaterThan(c5);
  });
});

describe('calculateConvergence', () => {
  it('detects full convergence when all competitors increase usage', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, COMPETITORS, 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    expect(result.convergenceRatio).toBe(1);
    expect(result.competitorsIncreasing).toBe(3);
    expect(result.crossTrack).toBe(true);
    expect(result.classification).toBe('STRONG_CONVERGENCE');
  });

  it('detects cross-track convergence', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, COMPETITORS, 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    expect(result.crossTrack).toBe(true);
    expect(result.trackAIncreasing).toBe(1);
    expect(result.trackBIncreasing).toBe(1);
  });

  it('returns NO_CONVERGENCE when no competitors increase', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a2', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, [COMPETITORS[0]], 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    expect(result.convergenceRatio).toBe(0);
    expect(result.classification).toBe('NO_CONVERGENCE');
  });

  it('skips competitors with no current-period ads', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a2', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a3', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, COMPETITORS.slice(0, 2), 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    expect(result.totalCompetitors).toBe(1);
    expect(result.competitorsIncreasing).toBe(1);
  });

  it('provides example ad IDs for increasing competitors', () => {
    const ads = [
      makeAd({ id: 'ex-1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'ex-2', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'old-1', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, [COMPETITORS[0]], 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    const comp = result.competitors.find(c => c.competitorId === 'c1')!;
    expect(comp.exampleAdIds).toContain('ex-1');
    expect(comp.exampleAdIds).toContain('ex-2');
  });

  it('applies cross-track multiplier to adjusted score (capped at 1.0)', () => {
    const ads = [
      makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
      makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
    ];

    const result = calculateConvergence(ads, COMPETITORS, 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    // 2/3 = 0.6667, cross_track = true, adjusted = min(1.0, 0.6667 * 1.5) = 1.0
    expect(result.adjustedScore).toBe(1.0);
    expect(result.convergenceRatio).toBeCloseTo(0.6667, 3);
  });

  it('handles empty competitor list', () => {
    const result = calculateConvergence([], [], 'format_type', 'ugc_talking_head', thirtyDaysAgo, fiftyDaysAgo);

    expect(result.totalCompetitors).toBe(0);
    expect(result.convergenceRatio).toBe(0);
    expect(result.classification).toBe('NO_CONVERGENCE');
  });
});

describe('analyzeCreativeConvergence', () => {
  it('returns null when fetchTaggedAds returns null', async () => {
    mockFetchTaggedAds.mockResolvedValue(null);

    const result = await analyzeCreativeConvergence('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when no tagged ads', async () => {
    mockFetchTaggedAds.mockResolvedValue({
      brandName: 'TestBrand',
      competitors: COMPETITORS,
      taggedAds: [],
    });

    const result = await analyzeCreativeConvergence('b1');
    expect(result).toBeNull();
  });

  it('returns structured analysis with all expected fields', async () => {
    mockFetchTaggedAds.mockResolvedValue({
      brandName: 'TestBrand',
      competitors: COMPETITORS,
      taggedAds: [
        makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      ],
    });

    mockFromCalls.push({
      table: 'convergence_snapshots',
      result: { data: [], error: null },
    });

    const result = await analyzeCreativeConvergence('b1');

    expect(result).not.toBeNull();
    expect(result!.competitiveSet).toBe('TestBrand Competitors');
    expect(result!.brandId).toBe('b1');
    expect(result!.totalCompetitors).toBe(3);
    expect(result!.strongConvergences).toBeDefined();
    expect(result!.moderateConvergences).toBeDefined();
    expect(result!.emergingPatterns).toBeDefined();
    expect(result!.marketShiftAlerts).toBeDefined();

    const ugcConvergence = [...result!.strongConvergences, ...result!.moderateConvergences, ...result!.emergingPatterns]
      .find(e => e.dimension === 'format_type' && e.value === 'ugc_talking_head');
    expect(ugcConvergence).toBeDefined();
    expect(ugcConvergence!.convergenceRatio).toBe(1);
  });

  it('flags new market shift alerts', async () => {
    mockFetchTaggedAds.mockResolvedValue({
      brandName: 'TestBrand',
      competitors: COMPETITORS,
      taggedAds: [
        makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      ],
    });

    // No previous strong convergences
    mockFromCalls.push({
      table: 'convergence_snapshots',
      result: { data: [], error: null },
    });

    const result = await analyzeCreativeConvergence('b1');

    expect(result!.marketShiftAlerts.length).toBeGreaterThan(0);
    const ugcAlert = result!.marketShiftAlerts.find(
      e => e.dimension === 'format_type' && e.value === 'ugc_talking_head'
    );
    expect(ugcAlert).toBeDefined();
    expect(ugcAlert!.isNewAlert).toBe(true);
  });

  it('does not flag existing strong convergences as alerts', async () => {
    mockFetchTaggedAds.mockResolvedValue({
      brandName: 'TestBrand',
      competitors: COMPETITORS,
      taggedAds: [
        makeAd({ id: 'a1', competitor_id: 'c1', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a2', competitor_id: 'c2', launch_date: today, competitor_track: 'velocity_tester', tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a3', competitor_id: 'c3', launch_date: today, tags: { format_type: 'ugc_talking_head' } }),
        makeAd({ id: 'a4', competitor_id: 'c1', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a5', competitor_id: 'c2', launch_date: fiftyDaysAgo, competitor_track: 'velocity_tester', tags: { format_type: 'static_image' } }),
        makeAd({ id: 'a6', competitor_id: 'c3', launch_date: fiftyDaysAgo, tags: { format_type: 'static_image' } }),
      ],
    });

    // Previous run already had this as STRONG_CONVERGENCE
    mockFromCalls.push({
      table: 'convergence_snapshots',
      result: {
        data: [{ dimension: 'format_type', value: 'ugc_talking_head' }],
        error: null,
      },
    });

    const result = await analyzeCreativeConvergence('b1');

    const ugcAlert = result!.marketShiftAlerts.find(
      e => e.dimension === 'format_type' && e.value === 'ugc_talking_head'
    );
    expect(ugcAlert).toBeUndefined();
  });
});
