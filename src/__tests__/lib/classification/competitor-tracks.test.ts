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
            // Return chainable that resolves to the entry result
            const resolveChain: Record<string, unknown> = {};
            const resolveSelf = () => resolveChain;
            resolveChain.eq = vi.fn().mockImplementation(resolveSelf);
            resolveChain.in = vi.fn().mockImplementation(resolveSelf);
            resolveChain.gte = vi.fn().mockImplementation(resolveSelf);
            resolveChain.lt = vi.fn().mockImplementation(resolveSelf);
            resolveChain.not = vi.fn().mockImplementation(resolveSelf);
            resolveChain.order = vi.fn().mockImplementation(resolveSelf);
            resolveChain.limit = vi.fn().mockImplementation(resolveSelf);
            resolveChain.then = (resolve: (v: unknown) => void) => {
              resolve(entry.result);
              return Promise.resolve(entry.result);
            };
            return resolveChain;
          }
          return chain;
        });
        chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
        chain.update = vi.fn().mockImplementation(self);
        chain.eq = vi.fn().mockImplementation(self);
        chain.in = vi.fn().mockImplementation(self);
        chain.gte = vi.fn().mockImplementation(self);
        chain.lt = vi.fn().mockImplementation(self);
        chain.not = vi.fn().mockImplementation(self);
        chain.order = vi.fn().mockImplementation(self);
        chain.limit = vi.fn().mockImplementation(() => {
          return Promise.resolve({ data: [], error: null });
        });
        return chain;
      };
      return makeChain();
    },
  }),
}));

import {
  calculateTrackASignal,
  calculateTrackBSignal,
  classifyCompetitor,
  runClassificationPipeline,
} from '@/lib/classification/competitor-tracks';

beforeEach(() => {
  vi.clearAllMocks();
  mockFromCalls.length = 0;
});

describe('classifyCompetitor', () => {
  it('classifies as consolidator when < 10 new ads', () => {
    const result = classifyCompetitor(5, null);
    expect(result.track).toBe('consolidator');
    expect(result.trackChanged).toBe(false);
  });

  it('classifies as velocity_tester when >= 10 new ads', () => {
    const result = classifyCompetitor(10, null);
    expect(result.track).toBe('velocity_tester');
    expect(result.trackChanged).toBe(false);
  });

  it('classifies as velocity_tester when many new ads', () => {
    const result = classifyCompetitor(25, null);
    expect(result.track).toBe('velocity_tester');
  });

  it('detects track change from consolidator to velocity_tester', () => {
    const result = classifyCompetitor(15, 'consolidator');
    expect(result.track).toBe('velocity_tester');
    expect(result.trackChanged).toBe(true);
  });

  it('detects track change from velocity_tester to consolidator', () => {
    const result = classifyCompetitor(3, 'velocity_tester');
    expect(result.track).toBe('consolidator');
    expect(result.trackChanged).toBe(true);
  });

  it('does not flag change when track stays the same', () => {
    const result = classifyCompetitor(5, 'consolidator');
    expect(result.trackChanged).toBe(false);
  });

  it('does not flag change on first classification (null previous)', () => {
    const result = classifyCompetitor(15, null);
    expect(result.trackChanged).toBe(false);
  });
});

describe('calculateTrackASignal', () => {
  it('returns low score for short-lived ads with few variations', () => {
    const score = calculateTrackASignal(3, 1);
    expect(score).toBeGreaterThanOrEqual(1);
    expect(score).toBeLessThanOrEqual(30);
  });

  it('returns high score for long-running ads with many variations', () => {
    const score = calculateTrackASignal(90, 5);
    expect(score).toBe(100);
  });

  it('caps at 100 for extremely long-running ads', () => {
    const score = calculateTrackASignal(365, 10);
    expect(score).toBe(100);
  });

  it('weights duration more than variations', () => {
    const durationOnly = calculateTrackASignal(90, 1);
    const variationsOnly = calculateTrackASignal(1, 5);
    expect(durationOnly).toBeGreaterThan(variationsOnly);
  });

  it('never goes below 1', () => {
    const score = calculateTrackASignal(0, 0);
    expect(score).toBeGreaterThanOrEqual(1);
  });

  it('scales linearly with duration', () => {
    const score30 = calculateTrackASignal(30, 1);
    const score60 = calculateTrackASignal(60, 1);
    expect(score60).toBeGreaterThan(score30);
  });
});

describe('calculateTrackBSignal', () => {
  it('gives high score to surviving ad when survival rate is low (selective filter)', () => {
    const score = calculateTrackBSignal(true, 0.1, 30);
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('gives lower score when survival rate is high (less selective)', () => {
    const score = calculateTrackBSignal(true, 0.8, 30);
    expect(score).toBeLessThanOrEqual(50);
  });

  it('gives low score to killed ads', () => {
    const score = calculateTrackBSignal(false, 0.1, 5);
    expect(score).toBeLessThanOrEqual(15);
  });

  it('floors surviving ads at minimum signal', () => {
    const score = calculateTrackBSignal(true, 0.99, 30);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it('killed ad score scales with days active', () => {
    const score3d = calculateTrackBSignal(false, 0.5, 3);
    const score10d = calculateTrackBSignal(false, 0.5, 10);
    expect(score10d).toBeGreaterThan(score3d);
  });

  it('never exceeds 100', () => {
    const score = calculateTrackBSignal(true, 0.01, 90);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('runClassificationPipeline', () => {
  it('returns zero stats when no competitors found', async () => {
    mockFromCalls.push({ table: 'competitors', result: { data: [], error: null } });

    const stats = await runClassificationPipeline();

    expect(stats.total).toBe(0);
    expect(stats.classified).toBe(0);
  });

  it('classifies a consolidator competitor with few ads', async () => {
    // 1st query: competitors
    mockFromCalls.push({
      table: 'competitors',
      result: {
        data: [{ id: 'comp-1', name: 'SlowBrand', track: null }],
        error: null,
      },
    });

    // 2nd query: recent ads
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [
          { id: 'ad-1', competitor_id: 'comp-1', launch_date: new Date().toISOString().split('T')[0], days_active: 30, variation_count: 3, is_active: true },
          { id: 'ad-2', competitor_id: 'comp-1', launch_date: new Date().toISOString().split('T')[0], days_active: 15, variation_count: 1, is_active: true },
        ],
        error: null,
      },
    });

    // 3rd query: all ads for scoring
    mockFromCalls.push({
      table: 'ads',
      result: {
        data: [
          { id: 'ad-1', competitor_id: 'comp-1', days_active: 30, variation_count: 3, is_active: true, launch_date: '2025-01-01' },
          { id: 'ad-2', competitor_id: 'comp-1', days_active: 15, variation_count: 1, is_active: true, launch_date: '2025-01-15' },
        ],
        error: null,
      },
    });

    const stats = await runClassificationPipeline();

    expect(stats.total).toBe(1);
    expect(stats.classified).toBe(1);
    expect(stats.trackChanges).toBe(0);
    expect(stats.adsScored).toBe(2);
  });

  it('classifies a velocity tester with many ads and calculates survival', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const manyAds = Array.from({ length: 15 }, (_, i) => ({
      id: `ad-${i}`,
      competitor_id: 'comp-fast',
      launch_date: twentyDaysAgo,
      days_active: i < 5 ? 3 : 20, // 5 killed early, 10 survived
      variation_count: 1,
      is_active: i >= 5, // first 5 inactive
    }));

    mockFromCalls.push({
      table: 'competitors',
      result: {
        data: [{ id: 'comp-fast', name: 'FastBrand', track: null }],
        error: null,
      },
    });

    mockFromCalls.push({
      table: 'ads',
      result: { data: manyAds, error: null },
    });

    mockFromCalls.push({
      table: 'ads',
      result: { data: manyAds, error: null },
    });

    const stats = await runClassificationPipeline();

    expect(stats.total).toBe(1);
    expect(stats.classified).toBe(1);
    expect(stats.adsScored).toBe(15);
  });

  it('logs track change when competitor switches tracks', async () => {
    mockFromCalls.push({
      table: 'competitors',
      result: {
        data: [{ id: 'comp-switch', name: 'Switcher', track: 'consolidator' }],
        error: null,
      },
    });

    // 12 ads in 30 days = velocity_tester (was consolidator)
    const recentAds = Array.from({ length: 12 }, (_, i) => ({
      id: `sw-ad-${i}`,
      competitor_id: 'comp-switch',
      launch_date: new Date().toISOString().split('T')[0],
      days_active: 5,
      variation_count: 1,
      is_active: true,
    }));

    mockFromCalls.push({
      table: 'ads',
      result: { data: recentAds, error: null },
    });

    mockFromCalls.push({
      table: 'ads',
      result: { data: recentAds, error: null },
    });

    const stats = await runClassificationPipeline();

    expect(stats.trackChanges).toBe(1);
  });

  it('returns zero stats on DB error', async () => {
    mockFromCalls.push({ table: 'competitors', result: { data: null, error: { message: 'DB error' } } });

    const stats = await runClassificationPipeline();

    expect(stats.total).toBe(0);
  });
});
