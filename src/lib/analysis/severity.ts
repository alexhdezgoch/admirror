import { DetectedTrend } from '@/types/analysis';

/**
 * Deterministic severity based on competitor breadth + longevity.
 * This is in a standalone file (no server dependencies) so it can be
 * safely imported in client-rendered PDF components.
 */
export function calculateTrendSeverity(
  trend: DetectedTrend
): NonNullable<DetectedTrend['gapDetails']>['severity'] {
  if (trend.hasGap === false) return 'aligned';

  const { competitorCount, avgDaysActive } = trend.evidence;
  if (competitorCount >= 3 && (avgDaysActive ?? 0) >= 30) return 'critical';
  if (competitorCount >= 2) return 'high';
  return 'moderate';
}
