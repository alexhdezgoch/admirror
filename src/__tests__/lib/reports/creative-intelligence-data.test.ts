import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock query builder that supports chaining
function createMockQuery(data: unknown[] | null = null) {
  const query: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'lt', 'order', 'limit', 'in', 'maybeSingle', 'single'];
  for (const method of methods) {
    query[method] = vi.fn().mockReturnValue(query);
  }
  // Terminal: resolve with data
  query['then'] = vi.fn((resolve: (val: unknown) => void) =>
    resolve({ data, error: null })
  );
  // Make it thenable (Promise-like)
  Object.defineProperty(query, 'then', {
    value: (resolve: (val: unknown) => void) => resolve({ data, error: null }),
    writable: true,
  });
  return query;
}

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { fetchCreativeIntelligenceData } from '@/lib/reports/creative-intelligence-data';

const snapshotDate = '2025-01-15';
const prevDate = '2025-01-08';

function makeVelocityRow(overrides: Record<string, unknown> = {}) {
  return {
    brand_id: 'brand-1',
    snapshot_date: snapshotDate,
    dimension: 'format',
    value: 'video',
    track_filter: 'all',
    weighted_prevalence: 50,
    ad_count: 10,
    ...overrides,
  };
}

function makeConvergenceRow(overrides: Record<string, unknown> = {}) {
  return {
    brand_id: 'brand-1',
    snapshot_date: snapshotDate,
    dimension: 'hook',
    value: 'question',
    classification: 'STRONG_CONVERGENCE',
    convergence_ratio: 0.85,
    cross_track: true,
    competitors_increasing: 4,
    total_competitors: 5,
    is_new_alert: false,
    ...overrides,
  };
}

describe('fetchCreativeIntelligenceData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no velocity snapshots exist', async () => {
    // First query (latest snapshot check) returns empty
    mockFrom.mockReturnValue(createMockQuery([]));

    const result = await fetchCreativeIntelligenceData('brand-1', false);
    expect(result).toBeNull();
  });

  it('returns structured data from mock snapshots', async () => {
    const currentRows = [
      makeVelocityRow({ dimension: 'format', value: 'video', weighted_prevalence: 60, ad_count: 15 }),
      makeVelocityRow({ dimension: 'format', value: 'image', weighted_prevalence: 40, ad_count: 8 }),
    ];
    const trackARows = [
      makeVelocityRow({ track_filter: 'consolidator', dimension: 'format', value: 'video', weighted_prevalence: 70 }),
    ];
    const trackBRows = [
      makeVelocityRow({ track_filter: 'velocity_tester', dimension: 'format', value: 'video', weighted_prevalence: 30 }),
    ];
    const prevRows = [
      makeVelocityRow({ snapshot_date: prevDate, dimension: 'format', value: 'video', weighted_prevalence: 40 }),
      makeVelocityRow({ snapshot_date: prevDate, dimension: 'format', value: 'image', weighted_prevalence: 45 }),
    ];
    const convergenceRows = [
      makeConvergenceRow(),
      makeConvergenceRow({ dimension: 'cta', value: 'shop now', is_new_alert: true, classification: 'MODERATE_CONVERGENCE' }),
    ];

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      // When hasMetaConnection=false, gap query is Promise.resolve (no .from() call)
      const datasets = [
        currentRows.slice(0, 1), // initial latest snapshot check
        currentRows,             // all track
        trackARows,              // track A
        trackBRows,              // track B
        prevRows,                // previous snapshot
        convergenceRows,         // convergence
        [],                      // breakout events
        [],                      // lifecycle
      ];
      return createMockQuery(datasets[callIndex++] ?? []);
    });

    const result = await fetchCreativeIntelligenceData('brand-1', false);
    expect(result).not.toBeNull();
    expect(result!.velocity.topAccelerating.length).toBeGreaterThan(0);
    expect(result!.velocity.topAccelerating[0].velocityPercent).toBe(50); // (60-40)/40 * 100
    expect(result!.velocity.topDeclining.length).toBeGreaterThan(0);
    expect(result!.velocity.trackDivergences.length).toBeGreaterThan(0);
    expect(result!.velocity.trackDivergences[0].divergencePercent).toBe(40); // 70-30
    expect(result!.convergence.strongConvergences.length).toBe(2);
    expect(result!.convergence.newAlerts.length).toBe(1);
    expect(result!.gaps).toBeNull();
    expect(result!.breakouts).toBeNull();
  });

  it('handles Meta connected with gap data', async () => {
    const currentRows = [
      makeVelocityRow(),
    ];
    const gapData = [{
      brand_id: 'brand-1',
      snapshot_date: snapshotDate,
      analysis_json: {
        priorityGaps: [
          { dimension: 'hook', value: 'urgency', clientPrevalence: 10, competitorPrevalence: 45, gapSize: 35, velocityDirection: 'accelerating', recommendation: 'Test urgency hooks' },
        ],
        strengths: [
          { dimension: 'format', value: 'carousel', clientPrevalence: 60, competitorPrevalence: 25 },
        ],
        summary: {
          biggestOpportunity: 'Urgency hooks',
          strongestMatch: 'Carousel format',
          totalGapsIdentified: 5,
        },
      },
    }];

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      const datasets = [
        currentRows,   // initial check
        currentRows,   // all track
        [],            // track A
        [],            // track B
        [],            // previous
        [],            // convergence
        gapData,       // gap analysis
        [],            // breakout events
        [],            // lifecycle
      ];
      return createMockQuery(datasets[callIndex++] ?? []);
    });

    const result = await fetchCreativeIntelligenceData('brand-1', true);
    expect(result).not.toBeNull();
    expect(result!.gaps).not.toBeNull();
    expect(result!.gaps!.priorityGaps).toHaveLength(1);
    expect(result!.gaps!.priorityGaps[0].dimension).toBe('hook');
    expect(result!.gaps!.strengths).toHaveLength(1);
    expect(result!.gaps!.summary.biggestOpportunity).toBe('Urgency hooks');
  });

  it('handles breakout events and lifecycle data', async () => {
    const currentRows = [makeVelocityRow()];
    const breakoutRows = [
      {
        brand_id: 'brand-1',
        analysis_date: snapshotDate,
        competitor_name: 'Competitor A',
        cohort_start: '2025-01-01',
        cohort_end: '2025-01-15',
        total_in_cohort: 12,
        survivors_count: 2,
        survival_rate: 0.167,
        top_survivor_traits: ['video', 'urgency hook'],
        analysis_summary: 'Video ads with urgency hooks survived',
      },
    ];
    const lifecycleRows = [{
      brand_id: 'brand-1',
      snapshot_date: snapshotDate,
      cash_cow_transitions: [
        { adId: 'ad-1', competitorName: 'Competitor A', daysActive: 90, traits: ['video', 'testimonial'] },
      ],
      winning_patterns: [
        { dimension: 'format', value: 'video', frequency: 8, avgLift: 0.35, confidence: 0.9 },
      ],
    }];

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      // When hasMetaConnection=false, the gap query is Promise.resolve (no .from() call)
      // So only 8 .from() calls: initial, all, trackA, trackB, prev, convergence, breakout, lifecycle
      const datasets = [
        currentRows,    // initial check
        currentRows,    // all track
        [],             // track A
        [],             // track B
        [],             // previous
        [],             // convergence
        breakoutRows,   // breakout events
        lifecycleRows,  // lifecycle
      ];
      return createMockQuery(datasets[callIndex++] ?? []);
    });

    const result = await fetchCreativeIntelligenceData('brand-1', false);
    expect(result).not.toBeNull();
    expect(result!.breakouts).not.toBeNull();
    expect(result!.breakouts!.events).toHaveLength(1);
    expect(result!.breakouts!.events[0].competitorName).toBe('Competitor A');
    expect(result!.breakouts!.events[0].survivalRate).toBe(0.167);
    expect(result!.breakouts!.cashCows).toHaveLength(1);
    expect(result!.breakouts!.winningPatterns).toHaveLength(1);
    expect(result!.breakouts!.winningPatterns[0].avgLift).toBe(0.35);
  });

  it('returns gaps as null when Meta not connected', async () => {
    const currentRows = [makeVelocityRow()];

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      // No .from() call for gap when hasMetaConnection=false
      const datasets = [
        currentRows, // initial check
        currentRows, // all track
        [],          // track A
        [],          // track B
        [],          // previous
        [],          // convergence
        [],          // breakouts
        [],          // lifecycle
      ];
      return createMockQuery(datasets[callIndex++] ?? []);
    });

    const result = await fetchCreativeIntelligenceData('brand-1', false);
    expect(result).not.toBeNull();
    expect(result!.gaps).toBeNull();
  });

  it('filters convergence to only STRONG and MODERATE classifications', async () => {
    const currentRows = [makeVelocityRow()];
    const convergenceRows = [
      makeConvergenceRow({ classification: 'STRONG_CONVERGENCE' }),
      makeConvergenceRow({ classification: 'MODERATE_CONVERGENCE', dimension: 'cta', value: 'buy now' }),
      makeConvergenceRow({ classification: 'WEAK_CONVERGENCE', dimension: 'tone', value: 'casual' }),
      makeConvergenceRow({ classification: 'NO_CONVERGENCE', dimension: 'color', value: 'blue' }),
    ];

    let callIndex = 0;
    mockFrom.mockImplementation(() => {
      // No .from() call for gap when hasMetaConnection=false
      const datasets = [
        currentRows,      // initial check
        currentRows,      // all track
        [],               // track A
        [],               // track B
        [],               // previous
        convergenceRows,  // convergence
        [],               // breakouts
        [],               // lifecycle
      ];
      return createMockQuery(datasets[callIndex++] ?? []);
    });

    const result = await fetchCreativeIntelligenceData('brand-1', false);
    expect(result).not.toBeNull();
    expect(result!.convergence.strongConvergences).toHaveLength(2);
    expect(result!.convergence.strongConvergences.map(c => c.dimension)).toEqual(['hook', 'cta']);
  });
});
