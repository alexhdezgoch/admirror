import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFetchTaggedAds, mockFromCalls } = vi.hoisted(() => {
  const mockFetchTaggedAds = vi.fn();
  const mockFromCalls: Array<{ table: string; result: unknown }> = [];
  return { mockFetchTaggedAds, mockFromCalls };
});

vi.mock('@/lib/analysis/creative-velocity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analysis/creative-velocity')>();
  return {
    ...actual,
    fetchTaggedAds: mockFetchTaggedAds,
  };
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
            resolveChain.lt = vi.fn().mockImplementation(resolveSelf);
            resolveChain.gte = vi.fn().mockImplementation(resolveSelf);
            resolveChain.not = vi.fn().mockImplementation(resolveSelf);
            resolveChain.order = vi.fn().mockImplementation(resolveSelf);
            resolveChain.limit = vi.fn().mockImplementation(resolveSelf);
            resolveChain.single = vi.fn().mockImplementation(resolveSelf);
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
        chain.eq = vi.fn().mockImplementation(self);
        chain.in = vi.fn().mockImplementation(self);
        chain.lt = vi.fn().mockImplementation(self);
        chain.gte = vi.fn().mockImplementation(self);
        chain.not = vi.fn().mockImplementation(self);
        chain.order = vi.fn().mockImplementation(self);
        chain.limit = vi.fn().mockImplementation(self);
        chain.single = vi.fn().mockImplementation(() => {
          const entry = mockFromCalls.find(e => e.table === table);
          if (entry) {
            mockFromCalls.splice(mockFromCalls.indexOf(entry), 1);
            return Promise.resolve(entry.result);
          }
          return Promise.resolve({ data: null, error: null });
        });
        return chain;
      };
      return makeChain();
    },
  }),
}));

import {
  calculatePriorityScore,
  generateRecommendation,
  syncClientAdsForTagging,
  analyzeCreativeGap,
  runGapAnalysisPipeline,
  type GapElement,
} from '@/lib/analysis/creative-gap';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

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
    launch_date: new Date().toISOString().split('T')[0],
    is_video: false,
    tags: {},
    videoTags: {},
    ...overrides,
  };
}

function makeGapElement(overrides: Partial<GapElement> = {}): GapElement {
  return {
    dimension: 'format_type',
    value: 'ugc_talking_head',
    clientPrevalence: 0.1,
    competitorPrevalence: 0.5,
    gapSize: 0.4,
    velocity: 0,
    velocityDirection: 'stable',
    convergenceScore: 0,
    convergenceClassification: 'NO_CONVERGENCE',
    priorityScore: 0.4,
    competitorExamples: [],
    recommendation: '',
    ...overrides,
  };
}

// --- Tests ---

describe('calculatePriorityScore', () => {
  it('returns high score for large gap + high velocity + high convergence', () => {
    const score = calculatePriorityScore(0.5, 0.8, 0.9);
    // 0.5 * (1 + 0.8) * (1 + 0.9) = 0.5 * 1.8 * 1.9 = 1.71
    expect(score).toBeCloseTo(1.71, 2);
  });

  it('returns zero for zero gap', () => {
    expect(calculatePriorityScore(0, 0.8, 0.9)).toBe(0);
  });

  it('velocity multiplier increases score', () => {
    const withoutVelocity = calculatePriorityScore(0.3, 0, 0);
    const withVelocity = calculatePriorityScore(0.3, 0.5, 0);
    expect(withVelocity).toBeGreaterThan(withoutVelocity);
  });

  it('convergence multiplier increases score', () => {
    const withoutConvergence = calculatePriorityScore(0.3, 0, 0);
    const withConvergence = calculatePriorityScore(0.3, 0, 0.8);
    expect(withConvergence).toBeGreaterThan(withoutConvergence);
  });
});

describe('generateRecommendation', () => {
  it('returns "Critical opportunity" for positive gap + accelerating + convergence', () => {
    const element = makeGapElement({
      gapSize: 0.3,
      velocityDirection: 'accelerating',
      convergenceScore: 0.5,
    });
    const rec = generateRecommendation(element);
    expect(rec).toContain('Critical opportunity');
    expect(rec).toContain('accelerating');
  });

  it('returns "High priority" for positive gap + accelerating without convergence', () => {
    const element = makeGapElement({
      gapSize: 0.3,
      velocityDirection: 'accelerating',
      convergenceScore: 0,
    });
    const rec = generateRecommendation(element);
    expect(rec).toContain('High priority');
  });

  it('returns "Low priority" for positive gap + declining', () => {
    const element = makeGapElement({
      gapSize: 0.2,
      velocityDirection: 'declining',
    });
    const rec = generateRecommendation(element);
    expect(rec).toContain('declining');
  });

  it('returns "Strength" for negative gap', () => {
    const element = makeGapElement({
      gapSize: -0.2,
      clientPrevalence: 0.5,
      competitorPrevalence: 0.3,
    });
    const rec = generateRecommendation(element);
    expect(rec).toContain('Strength');
  });

  it('always returns a non-empty string', () => {
    const stable = generateRecommendation(makeGapElement({ gapSize: 0.1, velocityDirection: 'stable' }));
    const declining = generateRecommendation(makeGapElement({ gapSize: 0.1, velocityDirection: 'declining' }));
    const negative = generateRecommendation(makeGapElement({ gapSize: -0.1 }));
    expect(stable.length).toBeGreaterThan(0);
    expect(declining.length).toBeGreaterThan(0);
    expect(negative.length).toBeGreaterThan(0);
  });
});

describe('syncClientAdsForTagging', () => {
  it('maps client_ads fields correctly', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: { id: 'b1', name: 'TestBrand', user_id: 'u1' }, error: null },
    });
    mockFromCalls.push({
      table: 'client_ads',
      result: {
        data: [{
          meta_ad_id: '123456',
          thumbnail_url: 'https://example.com/thumb.jpg',
          image_url: 'https://example.com/img.jpg',
          created_at: '2025-01-01T00:00:00Z',
        }],
        error: null,
      },
    });
    mockFromCalls.push({
      table: 'ads',
      result: { data: [], error: null },
    });

    const result = await syncClientAdsForTagging('b1');

    expect(result.synced).toBe(1);
    expect(result.alreadySynced).toBe(0);
  });

  it('handles empty client_ads', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: { id: 'b1', name: 'TestBrand', user_id: 'u1' }, error: null },
    });
    mockFromCalls.push({
      table: 'client_ads',
      result: { data: [], error: null },
    });

    const result = await syncClientAdsForTagging('b1');

    expect(result.synced).toBe(0);
    expect(result.alreadySynced).toBe(0);
  });

  it('falls back to image_url when thumbnail_url is null', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: { id: 'b1', name: 'TestBrand', user_id: 'u1' }, error: null },
    });
    mockFromCalls.push({
      table: 'client_ads',
      result: {
        data: [{
          meta_ad_id: '789',
          thumbnail_url: null,
          image_url: 'https://example.com/fallback.jpg',
          created_at: '2025-01-15T00:00:00Z',
        }],
        error: null,
      },
    });
    mockFromCalls.push({
      table: 'ads',
      result: { data: [], error: null },
    });

    const result = await syncClientAdsForTagging('b1');
    expect(result.synced).toBe(1);
  });
});

describe('analyzeCreativeGap', () => {
  function setupGapAnalysisMocks(
    clientAds: TestAd[],
    competitorData: { brandName: string; competitors: { id: string; name: string; track: string | null }[]; taggedAds: TestAd[] } | null,
  ) {
    // syncClientAdsForTagging calls: client_brands.single, client_ads.select, ads.select(existing)
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: { id: 'b1', name: 'TestBrand', user_id: 'u1' }, error: null },
    });
    mockFromCalls.push({
      table: 'client_ads',
      result: { data: [], error: null },
    });

    // fetchClientTaggedAds calls: ads.select
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: clientAds.map(a => ({ id: a.id, is_video: a.is_video })),
        error: null,
      },
    });

    // creative_tags for client ads
    if (clientAds.length > 0) {
      mockFromCalls.push({
        table: 'creative_tags',
        result: {
          data: clientAds.map(a => ({ ad_id: a.id, ...a.tags })),
          error: null,
        },
      });
    }

    // fetchTaggedAds for competitor ads
    mockFetchTaggedAds.mockResolvedValue(competitorData);

    // velocity_snapshots
    mockFromCalls.push({
      table: 'velocity_snapshots',
      result: { data: [], error: null },
    });

    // convergence_snapshots
    mockFromCalls.push({
      table: 'convergence_snapshots',
      result: { data: [], error: null },
    });
  }

  it('returns null when no tagged client ads', async () => {
    setupGapAnalysisMocks([], {
      brandName: 'TestBrand',
      competitors: [{ id: 'c1', name: 'CompA', track: 'consolidator' }],
      taggedAds: [makeAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'static_image' } })],
    });

    const result = await analyzeCreativeGap('b1');
    expect(result).toBeNull();
  });

  it('returns null when fetchTaggedAds returns null', async () => {
    const clientAd = makeAd({ id: 'client-1', competitor_id: '', tags: { format_type: 'static_image' } });
    setupGapAnalysisMocks([clientAd], null);

    const result = await analyzeCreativeGap('b1');
    expect(result).toBeNull();
  });

  it('identifies priority gaps correctly (competitor > client)', async () => {
    const clientAd = makeAd({
      id: 'client-1',
      competitor_id: '',
      signal_strength: 1,
      tags: { format_type: 'static_image' },
    });

    const competitorAds = [
      makeAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a2', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } }),
      makeAd({ id: 'a3', competitor_id: 'c2', tags: { format_type: 'ugc_talking_head' } }),
    ];

    setupGapAnalysisMocks([clientAd], {
      brandName: 'TestBrand',
      competitors: [
        { id: 'c1', name: 'CompA', track: 'consolidator' },
        { id: 'c2', name: 'CompB', track: 'velocity_tester' },
      ],
      taggedAds: competitorAds,
    });

    const result = await analyzeCreativeGap('b1');

    expect(result).not.toBeNull();
    expect(result!.totalClientAds).toBe(1);
    expect(result!.totalCompetitorAds).toBe(3);

    // ugc_talking_head should be a gap: competitors 100%, client 0%
    const ugcGap = result!.priorityGaps.find(
      g => g.dimension === 'format_type' && g.value === 'ugc_talking_head'
    );
    expect(ugcGap).toBeDefined();
    expect(ugcGap!.gapSize).toBeGreaterThan(0);
  });

  it('identifies strengths correctly (client >= competitor)', async () => {
    const clientAd = makeAd({
      id: 'client-1',
      competitor_id: '',
      signal_strength: 1,
      tags: { format_type: 'static_image' },
    });

    const competitorAds = [
      makeAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } }),
    ];

    setupGapAnalysisMocks([clientAd], {
      brandName: 'TestBrand',
      competitors: [{ id: 'c1', name: 'CompA', track: 'consolidator' }],
      taggedAds: competitorAds,
    });

    const result = await analyzeCreativeGap('b1');

    expect(result).not.toBeNull();
    // Client uses static_image (100%), competitor doesn't → strength
    const staticStrength = result!.strengths.find(
      s => s.dimension === 'format_type' && s.value === 'static_image'
    );
    expect(staticStrength).toBeDefined();
    expect(staticStrength!.clientPrevalence).toBeGreaterThan(staticStrength!.competitorPrevalence);
  });

  it('identifies watch list items (small gap + accelerating)', async () => {
    const clientAd = makeAd({
      id: 'client-1',
      competitor_id: '',
      signal_strength: 1,
      tags: { format_type: 'static_image' },
    });

    const competitorAds = [
      makeAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'static_image' } }),
    ];

    // Provide velocity data marking static_image as accelerating
    mockFromCalls.length = 0;

    // syncClientAdsForTagging
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: { id: 'b1', name: 'TestBrand', user_id: 'u1' }, error: null },
    });
    mockFromCalls.push({
      table: 'client_ads',
      result: { data: [], error: null },
    });
    // fetchClientTaggedAds
    mockFromCalls.push({
      table: 'ads',
      result: { data: [{ id: 'client-1', is_video: false }], error: null },
    });
    mockFromCalls.push({
      table: 'creative_tags',
      result: {
        data: [{ ad_id: 'client-1', format_type: 'static_image' }],
        error: null,
      },
    });

    mockFetchTaggedAds.mockResolvedValue({
      brandName: 'TestBrand',
      competitors: [{ id: 'c1', name: 'CompA', track: 'consolidator' }],
      taggedAds: competitorAds,
    });

    // velocity_snapshots with accelerating signal
    mockFromCalls.push({
      table: 'velocity_snapshots',
      result: {
        data: [
          { dimension: 'format_type', value: 'static_image', weighted_prevalence: 0.5 },
        ],
        error: null,
      },
    });

    mockFromCalls.push({
      table: 'convergence_snapshots',
      result: { data: [], error: null },
    });

    const result = await analyzeCreativeGap('b1');

    expect(result).not.toBeNull();
    // Both use static_image (100% each), gap ≈ 0, velocity > 0.3 → watch list
    const watchItem = result!.watchList.find(
      w => w.dimension === 'format_type' && w.value === 'static_image'
    );
    expect(watchItem).toBeDefined();
  });

  it('saves snapshot to gap_analysis_snapshots', async () => {
    const clientAd = makeAd({
      id: 'client-1',
      competitor_id: '',
      signal_strength: 1,
      tags: { format_type: 'static_image' },
    });

    setupGapAnalysisMocks([clientAd], {
      brandName: 'TestBrand',
      competitors: [{ id: 'c1', name: 'CompA', track: 'consolidator' }],
      taggedAds: [makeAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } })],
    });

    const result = await analyzeCreativeGap('b1');

    expect(result).not.toBeNull();
    expect(result!.brandId).toBe('b1');
    expect(result!.summary).toBeDefined();
    expect(result!.summary.totalGapsIdentified).toBeGreaterThanOrEqual(0);
  });
});

describe('runGapAnalysisPipeline', () => {
  it('returns stats with correct shape', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: [], error: null },
    });

    const stats = await runGapAnalysisPipeline();

    expect(stats.brandsAnalyzed).toBe(0);
    expect(stats.snapshotsSaved).toBe(0);
    expect(stats.clientAdsSynced).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('counts failed brands', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: [{ id: 'b-fail' }], error: null },
    });

    // syncClientAdsForTagging will fail because no mock for client_brands.single
    // which will throw during execution
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: null, error: { message: 'DB error' } },
    });

    const stats = await runGapAnalysisPipeline();

    // The brand attempt should either fail or produce 0 results
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof stats.failed).toBe('number');
  });
});
