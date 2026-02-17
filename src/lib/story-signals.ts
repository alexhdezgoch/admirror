import { ReportData, ComputedReport } from '@/types/report';
import {
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
} from '@/lib/analytics';

export function computeReport(data: ReportData): ComputedReport {
  const { allAds, clientAds, competitors, clientBrand } = data;

  // Group ads by competitor
  const competitorMap = new Map<string, { count: number; logo: string }>();
  allAds.forEach(ad => {
    const existing = competitorMap.get(ad.competitorName);
    if (existing) existing.count++;
    else competitorMap.set(ad.competitorName, { count: 1, logo: ad.competitorLogo });
  });

  return {
    signals: [], // stub — real signal computation added later
    distributions: {
      format: calculateFormatDistribution(allAds),
      velocity: calculateVelocityDistribution(allAds),
      signal: calculateSignalDistribution(allAds),
      grade: calculateGradeDistribution(allAds),
      hookType: calculateHookTypeDistribution(allAds),
    },
    perCompetitorCounts: Array.from(competitorMap.entries())
      .map(([name, { count, logo }]) => ({ name, count, logo }))
      .sort((a, b) => b.count - a.count),
    metadata: {
      totalAds: allAds.length,
      competitorCount: competitors.length,
      clientAdsCount: clientAds.length,
      metaConnected: clientAds.length > 0,
      generatedAt: new Date().toISOString(),
      brandName: clientBrand.name,
      industry: clientBrand.industry,
    },
  };
}
