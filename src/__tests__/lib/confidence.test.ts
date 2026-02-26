import { describe, it, expect } from 'vitest';
import {
  computeConfidenceScore,
  getConfidenceLabel,
  isProvenOrValidated,
  sortByConfidenceScore,
} from '@/lib/confidence';

describe('computeConfidenceScore', () => {
  it('ranks a proven 88-score ad above a 1-day 97-score ad', () => {
    expect(computeConfidenceScore(88, 200)).toBeGreaterThan(
      computeConfidenceScore(97, 1)
    );
  });

  it('ranks a quality 30-day ad above a low-score proven ad', () => {
    expect(computeConfidenceScore(95, 30)).toBeGreaterThan(
      computeConfidenceScore(50, 200)
    );
  });

  it('applies min multiplier at 0 days', () => {
    expect(computeConfidenceScore(100, 0)).toBe(60);
  });

  it('approaches max multiplier at 200 days', () => {
    expect(computeConfidenceScore(100, 200)).toBe(100);
  });
});

describe('getConfidenceLabel', () => {
  it('returns Unproven for 0 days', () => {
    expect(getConfidenceLabel(0)).toBe('Unproven');
  });

  it('returns Unproven for 6 days', () => {
    expect(getConfidenceLabel(6)).toBe('Unproven');
  });

  it('returns Early Signal for 7 days', () => {
    expect(getConfidenceLabel(7)).toBe('Early Signal');
  });

  it('returns Early Signal for 29 days', () => {
    expect(getConfidenceLabel(29)).toBe('Early Signal');
  });

  it('returns Validated for 30 days', () => {
    expect(getConfidenceLabel(30)).toBe('Validated');
  });

  it('returns Validated for 59 days', () => {
    expect(getConfidenceLabel(59)).toBe('Validated');
  });

  it('returns Proven for 60 days', () => {
    expect(getConfidenceLabel(60)).toBe('Proven');
  });
});

describe('isProvenOrValidated', () => {
  it('returns false for 29 days', () => {
    expect(isProvenOrValidated(29)).toBe(false);
  });

  it('returns true for 30 days', () => {
    expect(isProvenOrValidated(30)).toBe(true);
  });
});

describe('sortByConfidenceScore', () => {
  it('sorts ads by confidence score descending', () => {
    const ads = [
      { scoring: { final: 97 }, daysActive: 1 },
      { scoring: { final: 88 }, daysActive: 200 },
      { scoring: { final: 50 }, daysActive: 200 },
    ];

    const sorted = [...ads].sort(sortByConfidenceScore);
    expect(sorted[0].scoring.final).toBe(88);
    expect(sorted[1].scoring.final).toBe(97);
    expect(sorted[2].scoring.final).toBe(50);
  });
});
