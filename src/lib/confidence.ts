export type ConfidenceLabel = 'Proven' | 'Validated' | 'Early Signal' | 'Unproven';

const MIN_MULT = 0.60;
const TAU = 30;

export function computeConfidenceScore(finalScore: number, daysActive: number): number {
  const mult = MIN_MULT + (1 - MIN_MULT) * (1 - Math.exp(-daysActive / TAU));
  return Math.round(finalScore * mult);
}

export function getConfidenceLabel(daysActive: number): ConfidenceLabel {
  if (daysActive >= 60) return 'Proven';
  if (daysActive >= 30) return 'Validated';
  if (daysActive >= 7) return 'Early Signal';
  return 'Unproven';
}

export function isProvenOrValidated(daysActive: number): boolean {
  return daysActive >= 30;
}

export function sortByConfidenceScore(
  a: { scoring: { final: number }; daysActive: number },
  b: { scoring: { final: number }; daysActive: number }
): number {
  return (
    computeConfidenceScore(b.scoring.final, b.daysActive) -
    computeConfidenceScore(a.scoring.final, a.daysActive)
  );
}

export const confidenceLabelColors: Record<ConfidenceLabel, { bg: string; color: string }> = {
  Proven: { bg: '#DCFCE7', color: '#166534' },
  Validated: { bg: '#DBEAFE', color: '#1E40AF' },
  'Early Signal': { bg: '#FEF3C7', color: '#92400E' },
  Unproven: { bg: '#FEE2E2', color: '#991B1B' },
};
