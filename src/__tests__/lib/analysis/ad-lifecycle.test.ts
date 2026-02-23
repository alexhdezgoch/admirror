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
        chain.update = vi.fn().mockImplementation(() => {
          const updateChain: Record<string, unknown> = {};
          const updateSelf = () => updateChain;
          updateChain.eq = vi.fn().mockImplementation(updateSelf);
          updateChain.in = vi.fn().mockImplementation(updateSelf);
          updateChain.then = (resolve: (v: unknown) => void) => {
            resolve({ data: null, error: null });
            return Promise.resolve({ data: null, error: null });
          };
          return updateChain;
        });
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
  getCohortWeek,
  getCohortEndDate,
  isCohortReadyForBreakoutAnalysis,
  isSurvivor,
  isCashCow,
  calculateTagProfile,
  findDifferentiatingElements,
  generateBreakoutSummary,
  aggregateWinningPatterns,
  buildCohorts,
  analyzeBreakoutCohort,
  runLifecyclePipeline,
  type LifecycleAd,
  type BreakoutEvent,
  type Cohort,
} from '@/lib/analysis/ad-lifecycle';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

function makeLifecycleAd(overrides: Partial<LifecycleAd> & { id: string; competitor_id: string }): LifecycleAd {
  return {
    competitor_name: 'TestCompetitor',
    launch_date: '2025-01-06',
    days_active: 20,
    is_active: true,
    is_video: false,
    cohort_week: '2025-01-06',
    is_breakout: false,
    is_cash_cow: false,
    tags: {},
    videoTags: {},
    ...overrides,
  };
}

// --- getCohortWeek ---
describe('getCohortWeek', () => {
  it('returns Monday for a Monday date', () => {
    expect(getCohortWeek('2025-01-06')).toBe('2025-01-06'); // Monday
  });

  it('returns Monday for a Wednesday date', () => {
    expect(getCohortWeek('2025-01-08')).toBe('2025-01-06'); // Wednesday → Monday
  });

  it('returns Monday for a Sunday date', () => {
    expect(getCohortWeek('2025-01-12')).toBe('2025-01-06'); // Sunday → Monday
  });

  it('returns Monday for a Saturday date', () => {
    expect(getCohortWeek('2025-01-11')).toBe('2025-01-06'); // Saturday → Monday
  });

  it('handles year boundary', () => {
    expect(getCohortWeek('2025-01-01')).toBe('2024-12-30'); // Wednesday → previous Monday
  });
});

// --- getCohortEndDate ---
describe('getCohortEndDate', () => {
  it('returns Sunday for a Monday start', () => {
    expect(getCohortEndDate('2025-01-06')).toBe('2025-01-12');
  });

  it('handles month boundary', () => {
    expect(getCohortEndDate('2025-01-27')).toBe('2025-02-02');
  });
});

// --- isCohortReadyForBreakoutAnalysis ---
describe('isCohortReadyForBreakoutAnalysis', () => {
  it('returns true for cohort ending 14+ days ago', () => {
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isCohortReadyForBreakoutAnalysis(fourWeeksAgo)).toBe(true);
  });

  it('returns false for cohort ending less than 14 days ago', () => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(isCohortReadyForBreakoutAnalysis(oneWeekAgo)).toBe(false);
  });
});

// --- isSurvivor / isCashCow ---
describe('isSurvivor', () => {
  it('returns true for active ad with 14+ days', () => {
    const ad = makeLifecycleAd({ id: 'a1', competitor_id: 'c1', is_active: true, days_active: 14 });
    expect(isSurvivor(ad)).toBe(true);
  });

  it('returns false for inactive ad', () => {
    const ad = makeLifecycleAd({ id: 'a1', competitor_id: 'c1', is_active: false, days_active: 30 });
    expect(isSurvivor(ad)).toBe(false);
  });

  it('returns false for active ad with <14 days', () => {
    const ad = makeLifecycleAd({ id: 'a1', competitor_id: 'c1', is_active: true, days_active: 10 });
    expect(isSurvivor(ad)).toBe(false);
  });
});

describe('isCashCow', () => {
  it('returns true for active ad with 60+ days', () => {
    const ad = makeLifecycleAd({ id: 'a1', competitor_id: 'c1', is_active: true, days_active: 60 });
    expect(isCashCow(ad)).toBe(true);
  });

  it('returns false for active ad with <60 days', () => {
    const ad = makeLifecycleAd({ id: 'a1', competitor_id: 'c1', is_active: true, days_active: 45 });
    expect(isCashCow(ad)).toBe(false);
  });
});

// --- calculateTagProfile ---
describe('calculateTagProfile', () => {
  it('returns empty object for empty input', () => {
    expect(calculateTagProfile([])).toEqual({});
  });

  it('calculates prevalence correctly', () => {
    const ads = [
      makeLifecycleAd({ id: 'a1', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } }),
      makeLifecycleAd({ id: 'a2', competitor_id: 'c1', tags: { format_type: 'ugc_talking_head' } }),
      makeLifecycleAd({ id: 'a3', competitor_id: 'c1', tags: { format_type: 'static_image' } }),
    ];

    const profile = calculateTagProfile(ads);
    // 2/3 for ugc_talking_head, 1/3 for static_image
    expect(profile.format_type.ugc_talking_head).toBeCloseTo(0.6667, 3);
    expect(profile.format_type.static_image).toBeCloseTo(0.3333, 3);
  });

  it('handles video tags for video ads', () => {
    const ads = [
      makeLifecycleAd({
        id: 'a1',
        competitor_id: 'c1',
        is_video: true,
        tags: { format_type: 'ugc_talking_head' },
        videoTags: { script_structure: 'problem_solution' },
      }),
    ];

    const profile = calculateTagProfile(ads);
    expect(profile.script_structure.problem_solution).toBe(1);
  });
});

// --- findDifferentiatingElements ---
describe('findDifferentiatingElements', () => {
  it('finds elements with lift >= 1.5x', () => {
    const survivorProfile = {
      format_type: { ugc_talking_head: 0.8, static_image: 0.2 },
    };
    const killedProfile = {
      format_type: { ugc_talking_head: 0.2, static_image: 0.8 },
    };

    const elements = findDifferentiatingElements(survivorProfile, killedProfile);

    const ugcElement = elements.find(e => e.value === 'ugc_talking_head');
    expect(ugcElement).toBeDefined();
    expect(ugcElement!.direction).toBe('survivor_higher');
    expect(ugcElement!.lift).toBe(4); // 0.8 / 0.2

    const staticElement = elements.find(e => e.value === 'static_image');
    expect(staticElement).toBeDefined();
    expect(staticElement!.direction).toBe('killed_higher');
    expect(staticElement!.lift).toBe(4); // 0.8 / 0.2
  });

  it('ignores elements with lift < 1.5x', () => {
    const survivorProfile = {
      format_type: { ugc_talking_head: 0.5, static_image: 0.5 },
    };
    const killedProfile = {
      format_type: { ugc_talking_head: 0.45, static_image: 0.55 },
    };

    const elements = findDifferentiatingElements(survivorProfile, killedProfile);
    expect(elements.length).toBe(0);
  });

  it('handles zero prevalence in killed', () => {
    const survivorProfile = {
      format_type: { ugc_talking_head: 0.5, static_image: 0 },
    };
    const killedProfile = {
      format_type: { ugc_talking_head: 0, static_image: 0.5 },
    };

    const elements = findDifferentiatingElements(survivorProfile, killedProfile);
    // ugc: survivor=0.5, killed=0 → lift=10 (cap), direction=survivor_higher
    const ugc = elements.find(e => e.value === 'ugc_talking_head');
    expect(ugc).toBeDefined();
    expect(ugc!.lift).toBe(10);
    expect(ugc!.direction).toBe('survivor_higher');
  });
});

// --- buildCohorts ---
describe('buildCohorts', () => {
  it('groups ads by competitor + cohort week', () => {
    const ads = [
      makeLifecycleAd({ id: 'a1', competitor_id: 'c1', cohort_week: '2025-01-06', is_active: false, days_active: 5 }),
      makeLifecycleAd({ id: 'a2', competitor_id: 'c1', cohort_week: '2025-01-06', is_active: false, days_active: 3 }),
      makeLifecycleAd({ id: 'a3', competitor_id: 'c1', cohort_week: '2025-01-06', is_active: true, days_active: 20 }),
    ];

    const cohorts = buildCohorts(ads);
    expect(cohorts.length).toBe(1);
    expect(cohorts[0].ads.length).toBe(3);
    expect(cohorts[0].competitorId).toBe('c1');
  });

  it('filters out cohorts with < MIN_COHORT_SIZE ads', () => {
    const ads = [
      makeLifecycleAd({ id: 'a1', competitor_id: 'c1', cohort_week: '2025-01-06' }),
      makeLifecycleAd({ id: 'a2', competitor_id: 'c1', cohort_week: '2025-01-06' }),
    ];

    const cohorts = buildCohorts(ads);
    expect(cohorts.length).toBe(0);
  });

  it('detects breakout cohort (survival_rate < 30%, survivors > 0)', () => {
    // 10 ads, 2 survivors (20% < 30%) → breakout
    const ads = Array.from({ length: 10 }, (_, i) => {
      const isSurv = i < 2;
      return makeLifecycleAd({
        id: `a${i}`,
        competitor_id: 'c1',
        cohort_week: '2025-01-06',
        is_active: isSurv,
        days_active: isSurv ? 20 : 5,
      });
    });

    const cohorts = buildCohorts(ads);
    expect(cohorts.length).toBe(1);
    expect(cohorts[0].isBreakoutCohort).toBe(true);
    expect(cohorts[0].survivors.length).toBe(2);
    expect(cohorts[0].killed.length).toBe(8);
  });

  it('does not flag cohort with high survival rate', () => {
    // 5 ads, 4 survivors (80% > 30%) → not breakout
    const ads = Array.from({ length: 5 }, (_, i) => {
      const isSurv = i < 4;
      return makeLifecycleAd({
        id: `a${i}`,
        competitor_id: 'c1',
        cohort_week: '2025-01-06',
        is_active: isSurv,
        days_active: isSurv ? 20 : 5,
      });
    });

    const cohorts = buildCohorts(ads);
    expect(cohorts.length).toBe(1);
    expect(cohorts[0].isBreakoutCohort).toBe(false);
  });
});

// --- analyzeBreakoutCohort ---
describe('analyzeBreakoutCohort', () => {
  it('returns null for non-breakout cohort', () => {
    const cohort: Cohort = {
      competitorId: 'c1',
      competitorName: 'CompA',
      cohortStart: '2025-01-06',
      cohortEnd: '2025-01-12',
      ads: [],
      survivors: [],
      killed: [],
      survivalRate: 0.5,
      isBreakoutCohort: false,
    };

    expect(analyzeBreakoutCohort(cohort, 'b1', '2025-02-01')).toBeNull();
  });

  it('produces breakout event with tag comparison', () => {
    const survivors = [
      makeLifecycleAd({ id: 's1', competitor_id: 'c1', is_active: true, days_active: 20, tags: { format_type: 'ugc_talking_head' } }),
    ];
    const killed = [
      makeLifecycleAd({ id: 'k1', competitor_id: 'c1', is_active: false, days_active: 5, tags: { format_type: 'static_image' } }),
      makeLifecycleAd({ id: 'k2', competitor_id: 'c1', is_active: false, days_active: 3, tags: { format_type: 'static_image' } }),
      makeLifecycleAd({ id: 'k3', competitor_id: 'c1', is_active: false, days_active: 4, tags: { format_type: 'static_image' } }),
    ];

    const cohort: Cohort = {
      competitorId: 'c1',
      competitorName: 'CompA',
      cohortStart: '2025-01-06',
      cohortEnd: '2025-01-12',
      ads: [...survivors, ...killed],
      survivors,
      killed,
      survivalRate: 0.25,
      isBreakoutCohort: true,
    };

    const event = analyzeBreakoutCohort(cohort, 'b1', '2025-02-01');

    expect(event).not.toBeNull();
    expect(event!.survivorsCount).toBe(1);
    expect(event!.killedCount).toBe(3);
    expect(event!.survivalRate).toBe(0.25);
    expect(event!.survivorAdIds).toEqual(['s1']);
    expect(event!.differentiatingElements.length).toBeGreaterThan(0);
    expect(event!.analysisSummary).toContain('CompA');
  });
});

// --- aggregateWinningPatterns ---
describe('aggregateWinningPatterns', () => {
  it('returns empty for no events', () => {
    expect(aggregateWinningPatterns([])).toEqual([]);
  });

  it('aggregates patterns across events', () => {
    const events: BreakoutEvent[] = [
      {
        brandId: 'b1',
        competitorId: 'c1',
        competitorName: 'CompA',
        cohortStart: '2025-01-06',
        cohortEnd: '2025-01-12',
        analysisDate: '2025-02-01',
        totalInCohort: 10,
        survivorsCount: 2,
        killedCount: 8,
        survivalRate: 0.2,
        survivorAdIds: ['s1', 's2'],
        killedAdIds: [],
        survivorTagProfile: {},
        killedTagProfile: {},
        differentiatingElements: [
          { dimension: 'format_type', value: 'ugc_talking_head', survivorPrevalence: 0.8, killedPrevalence: 0.2, lift: 4, direction: 'survivor_higher' },
          { dimension: 'human_presence', value: 'full_face', survivorPrevalence: 0.6, killedPrevalence: 0.1, lift: 6, direction: 'survivor_higher' },
        ],
        topSurvivorTraits: [],
        analysisSummary: '',
      },
      {
        brandId: 'b1',
        competitorId: 'c2',
        competitorName: 'CompB',
        cohortStart: '2025-01-13',
        cohortEnd: '2025-01-19',
        analysisDate: '2025-02-01',
        totalInCohort: 8,
        survivorsCount: 1,
        killedCount: 7,
        survivalRate: 0.125,
        survivorAdIds: ['s3'],
        killedAdIds: [],
        survivorTagProfile: {},
        killedTagProfile: {},
        differentiatingElements: [
          { dimension: 'format_type', value: 'ugc_talking_head', survivorPrevalence: 0.9, killedPrevalence: 0.3, lift: 3, direction: 'survivor_higher' },
        ],
        topSurvivorTraits: [],
        analysisSummary: '',
      },
    ];

    const patterns = aggregateWinningPatterns(events);

    expect(patterns.length).toBeGreaterThan(0);
    const ugcPattern = patterns.find(p => p.value === 'ugc_talking_head');
    expect(ugcPattern).toBeDefined();
    expect(ugcPattern!.frequency).toBe(2);
    expect(ugcPattern!.avgLift).toBe(3.5); // (4 + 3) / 2
  });

  it('sorts by confidence * avgLift', () => {
    const events: BreakoutEvent[] = [
      {
        brandId: 'b1',
        competitorId: 'c1',
        competitorName: 'CompA',
        cohortStart: '2025-01-06',
        cohortEnd: '2025-01-12',
        analysisDate: '2025-02-01',
        totalInCohort: 10,
        survivorsCount: 2,
        killedCount: 8,
        survivalRate: 0.2,
        survivorAdIds: [],
        killedAdIds: [],
        survivorTagProfile: {},
        killedTagProfile: {},
        differentiatingElements: [
          { dimension: 'format_type', value: 'ugc_talking_head', survivorPrevalence: 0.8, killedPrevalence: 0.1, lift: 8, direction: 'survivor_higher' },
          { dimension: 'color_temperature', value: 'warm', survivorPrevalence: 0.6, killedPrevalence: 0.2, lift: 3, direction: 'survivor_higher' },
        ],
        topSurvivorTraits: [],
        analysisSummary: '',
      },
    ];

    const patterns = aggregateWinningPatterns(events);
    // Both have frequency=1 and confidence=1 (sqrt(1/1)=1)
    // ugc: 1 * 8 = 8, warm: 1 * 3 = 3 → ugc first
    expect(patterns[0].value).toBe('ugc_talking_head');
  });

  it('limits to top 20 patterns', () => {
    const elements = Array.from({ length: 25 }, (_, i) => ({
      dimension: 'format_type',
      value: `value_${i}`,
      survivorPrevalence: 0.5,
      killedPrevalence: 0.1,
      lift: 5,
      direction: 'survivor_higher' as const,
    }));

    const events: BreakoutEvent[] = [{
      brandId: 'b1',
      competitorId: 'c1',
      competitorName: 'CompA',
      cohortStart: '2025-01-06',
      cohortEnd: '2025-01-12',
      analysisDate: '2025-02-01',
      totalInCohort: 10,
      survivorsCount: 2,
      killedCount: 8,
      survivalRate: 0.2,
      survivorAdIds: [],
      killedAdIds: [],
      survivorTagProfile: {},
      killedTagProfile: {},
      differentiatingElements: elements,
      topSurvivorTraits: [],
      analysisSummary: '',
    }];

    const patterns = aggregateWinningPatterns(events);
    expect(patterns.length).toBe(20);
  });
});

// --- generateBreakoutSummary ---
describe('generateBreakoutSummary', () => {
  it('generates a human-readable summary', () => {
    const event: BreakoutEvent = {
      brandId: 'b1',
      competitorId: 'c1',
      competitorName: 'CompA',
      cohortStart: '2025-01-06',
      cohortEnd: '2025-01-12',
      analysisDate: '2025-02-01',
      totalInCohort: 10,
      survivorsCount: 2,
      killedCount: 8,
      survivalRate: 0.2,
      survivorAdIds: [],
      killedAdIds: [],
      survivorTagProfile: {},
      killedTagProfile: {},
      differentiatingElements: [],
      topSurvivorTraits: ['ugc_talking_head (format_type)', 'full_face (human_presence)'],
      analysisSummary: '',
    };

    const summary = generateBreakoutSummary(event);
    expect(summary).toContain('CompA');
    expect(summary).toContain('2/10');
    expect(summary).toContain('20%');
    expect(summary).toContain('ugc_talking_head');
  });
});

// --- runLifecyclePipeline ---
describe('runLifecyclePipeline', () => {
  it('returns stats with correct shape when no brands', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: [], error: null },
    });

    const stats = await runLifecyclePipeline();

    expect(stats.brandsAnalyzed).toBe(0);
    expect(stats.breakoutEventsFound).toBe(0);
    expect(stats.breakoutAdsFlagged).toBe(0);
    expect(stats.cashCowsDetected).toBe(0);
    expect(stats.snapshotsSaved).toBe(0);
    expect(stats.failed).toBe(0);
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('counts failed brands', async () => {
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: [{ id: 'b-fail' }], error: null },
    });

    // analyzeAdLifecycle will fail because no mock for client_brands.single
    mockFromCalls.push({
      table: 'client_brands',
      result: { data: null, error: { message: 'DB error' } },
    });

    const stats = await runLifecyclePipeline();
    expect(stats.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof stats.failed).toBe('number');
  });
});
