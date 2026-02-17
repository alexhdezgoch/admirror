import { ReportData, ComputedReport, StorySignal } from '@/types/report';
import {
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
} from '@/lib/analytics';

function computeStorySignals(
  distributions: ComputedReport['distributions'],
  perCompetitorCounts: ComputedReport['perCompetitorCounts'],
  clientAdsCount: number,
): StorySignal[] {
  const signals: StorySignal[] = [];

  // 1. Volume signal — ad volume across competitors
  if (perCompetitorCounts.length > 0) {
    const totalAds = perCompetitorCounts.reduce((sum, c) => sum + c.count, 0);
    const avg = Math.round(totalAds / perCompetitorCounts.length);
    const top = perCompetitorCounts[0];
    const severity = clientAdsCount < avg * 0.5 ? 8 : clientAdsCount < avg ? 5 : 3;

    signals.push({
      id: 'signal-volume',
      category: 'volume',
      headline: `${perCompetitorCounts.length} competitors running ${totalAds} total ads`,
      detail: `The most active competitor (${top.name}) has ${top.count} ads. The industry average is ${avg} ads per brand. ${clientAdsCount > 0 ? `Your brand has ${clientAdsCount} ads.` : 'Connect Meta to compare your volume.'}`,
      severity,
      dataPoints: {
        competitors: perCompetitorCounts.map(c => ({ name: c.name, count: c.count })),
        brandCount: clientAdsCount,
        average: avg,
        industryAvg: avg,
      },
      visualType: 'bar_chart',
    });
  }

  // 2. Quality signal — grade distribution
  if (distributions.grade.length > 0) {
    const topGrades = distributions.grade.filter(g => g.name === 'A+' || g.name === 'A');
    const topPct = topGrades.reduce((s, g) => s + g.value, 0);
    const lowGrades = distributions.grade.filter(g => g.name === 'D' || g.name === 'F');
    const lowPct = lowGrades.reduce((s, g) => s + g.value, 0);
    const severity = topPct < 20 ? 7 : topPct < 40 ? 5 : 3;

    signals.push({
      id: 'signal-quality',
      category: 'quality',
      headline: `${Math.round(topPct)}% of ads score A or above`,
      detail: `Grade distribution shows ${Math.round(topPct)}% of ads earning A+ or A grades, while ${Math.round(lowPct)}% fall to D or below. High-grade ads correlate with longer run times and stronger performance signals.`,
      severity,
      dataPoints: {
        rows: distributions.grade.map(g => ({
          cells: [g.name, `${Math.round(g.value)}%`],
        })),
        statValue: `${Math.round(topPct)}%`,
        statContext: 'of ads rated A or above',
      },
      visualType: 'bar_chart',
    });
  }

  // 3. Format signal — dominant format breakdown
  if (distributions.format.length > 0) {
    const sorted = [...distributions.format].sort((a, b) => b.value - a.value);
    const dominant = sorted[0];
    const missingFormats = sorted.filter(f => f.value < 5).map(f => f.name).join(', ') || 'None';
    const severity = sorted.filter(f => f.value >= 10).length <= 1 ? 7 : 4;

    signals.push({
      id: 'signal-format',
      category: 'format',
      headline: `${dominant.name} dominates at ${Math.round(dominant.value)}% of all ads`,
      detail: `${dominant.name} is the most common format across the competitive set. ${missingFormats !== 'None' ? `Underrepresented formats: ${missingFormats}.` : 'All formats are well-represented.'} Diversifying format mix can unlock new audience segments.`,
      severity,
      dataPoints: {
        rows: sorted.map(f => ({
          cells: [f.name, `${Math.round(f.value)}%`],
        })),
        missingFormats,
        statValue: `${Math.round(dominant.value)}%`,
        statContext: `of ads use ${dominant.name} format`,
      },
      visualType: 'bar_chart',
    });
  }

  // 4. Velocity signal — publishing cadence / ad health
  if (distributions.velocity.length > 0) {
    const scaling = distributions.velocity.find(v => v.name === 'Scaling');
    const testing = distributions.velocity.find(v => v.name === 'Testing');
    const newAds = distributions.velocity.find(v => v.name === 'New');
    const scalingPct = scaling?.value ?? 0;
    const testingPct = testing?.value ?? 0;
    const newPct = newAds?.value ?? 0;
    const severity = scalingPct < 15 ? 8 : scalingPct < 30 ? 5 : 3;

    signals.push({
      id: 'signal-velocity',
      category: 'velocity',
      headline: `${Math.round(scalingPct)}% of ads are in scaling phase`,
      detail: `${Math.round(scalingPct)}% of ads are scaling (long-running winners), ${Math.round(testingPct)}% are in testing phase, and ${Math.round(newPct)}% are new launches. A healthy pipeline needs a steady flow from new → testing → scaling.`,
      severity,
      dataPoints: {
        statValue: `${Math.round(scalingPct)}%`,
        statContext: `scaling ads | ${Math.round(testingPct)}% testing | ${Math.round(newPct)}% new`,
      },
      visualType: 'stat_callout',
    });
  }

  // 5. Creative signal — hook type patterns
  if (distributions.hookType.length > 0) {
    const sorted = [...distributions.hookType].sort((a, b) => b.value - a.value);
    const topHook = sorted[0];
    const diversity = sorted.filter(h => h.value >= 10).length;
    const severity = diversity <= 1 ? 7 : diversity <= 2 ? 5 : 3;

    signals.push({
      id: 'signal-creative',
      category: 'creative',
      headline: `"${topHook.name}" hooks lead at ${Math.round(topHook.value)}%`,
      detail: `${topHook.name} is the dominant hook strategy in your competitive set. ${diversity <= 2 ? 'Hook diversity is low — there may be an opportunity to stand out with alternative approaches.' : `${diversity} hook types are actively used, showing a diverse creative landscape.`}`,
      severity,
      dataPoints: {
        rows: sorted.map(h => ({
          cells: [h.name, `${Math.round(h.value)}%`],
        })),
        statValue: `${Math.round(topHook.value)}%`,
        statContext: `of ads use ${topHook.name} hooks`,
      },
      visualType: 'bar_chart',
    });
  }

  return signals.sort((a, b) => b.severity - a.severity);
}

export function computeReport(data: ReportData): ComputedReport {
  const { allAds, clientAds, competitors, clientBrand } = data;

  // Group ads by competitor
  const competitorMap = new Map<string, { count: number; logo: string }>();
  allAds.forEach(ad => {
    const existing = competitorMap.get(ad.competitorName);
    if (existing) existing.count++;
    else competitorMap.set(ad.competitorName, { count: 1, logo: ad.competitorLogo });
  });

  const distributions = {
    format: calculateFormatDistribution(allAds),
    velocity: calculateVelocityDistribution(allAds),
    signal: calculateSignalDistribution(allAds),
    grade: calculateGradeDistribution(allAds),
    hookType: calculateHookTypeDistribution(allAds),
  };

  const perCompetitorCounts = Array.from(competitorMap.entries())
    .map(([name, { count, logo }]) => ({ name, count, logo }))
    .sort((a, b) => b.count - a.count);

  const signals = computeStorySignals(distributions, perCompetitorCounts, clientAds.length);

  return {
    signals,
    distributions,
    perCompetitorCounts,
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
