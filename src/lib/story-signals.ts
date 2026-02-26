import { ReportData, ComputedReport, StorySignal } from '@/types/report';
import { computeConfidenceScore } from '@/lib/confidence';
import {
  DistributionItem,
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
} from '@/lib/analytics';

/**
 * Map a 0–100 raw severity to the 1–10 scale SignalDeepDive.tsx expects.
 *   0-30  → 2-3  (MINOR:    severity < 4)
 *  30-60  → 4-6  (MODERATE: severity >= 4 && < 7)
 *  60-100 → 7-9  (CRITICAL: severity >= 7)
 */
function normalizeSeverity(raw: number): number {
  const clamped = Math.max(0, Math.min(100, raw));
  if (clamped <= 30) return 2 + (clamped / 30);           // 2.0 – 3.0
  if (clamped <= 60) return 4 + ((clamped - 30) / 30) * 2; // 4.0 – 6.0
  return 7 + ((clamped - 60) / 40) * 2;                    // 7.0 – 9.0
}

// --- Configurable threshold for "top N" rankings ---
export const TOP_ADS_THRESHOLD = 20;

// --- Signal compute functions ---

function computeVolumeGap(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  const compCounts = new Map<string, number>();
  allAds.forEach(ad => {
    if (ad.isClientAd) return;
    compCounts.set(ad.competitorName, (compCounts.get(ad.competitorName) || 0) + 1);
  });

  if (compCounts.size === 0) return null;

  const counts = Array.from(compCounts.values());
  const avgCompetitorAds = counts.reduce((a, b) => a + b, 0) / counts.length;
  const clientAdCount = clientAds.length;

  const competitors = Array.from(compCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  competitors.push({ name: brandName, count: clientAdCount });

  let rawSeverity: number;
  let headline: string;

  if (clientAdCount === 0 && compCounts.size > 0) {
    rawSeverity = 85;
    headline = `${brandName} has zero tracked ads while competitors average ${Math.round(avgCompetitorAds)}`;
  } else {
    rawSeverity = Math.min(100, Math.max(0, Math.round((1 - clientAdCount / avgCompetitorAds) * 100)));
    headline = `${brandName} runs ${clientAdCount} ads vs. industry average of ${Math.round(avgCompetitorAds)}`;
  }

  if (rawSeverity < 20) return null;

  return {
    id: 'signal-volume',
    category: 'volume',
    headline,
    detail: `Your brand has ${clientAdCount} active ads compared to an industry average of ${Math.round(avgCompetitorAds)} across ${compCounts.size} competitors. A lower ad volume can limit your share of voice and reduce the chances of finding winning creatives through testing.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      competitors,
      brandCount: clientAdCount,
      average: Math.round(avgCompetitorAds),
      statValue: `${clientAdCount} ads`,
      statContext: `Industry average: ${Math.round(avgCompetitorAds)} ads`,
    },
    visualType: 'bar_chart',
  };
}

function computeTopAdsAbsence(data: ReportData, brandName: string): StorySignal | null {
  const N = TOP_ADS_THRESHOLD;
  const { allAds, clientAds } = data;
  const merged = [...allAds, ...clientAds.filter(ca => !allAds.some(a => a.id === ca.id))];
  if (merged.length === 0) return null;

  const sorted = [...merged].sort((a, b) =>
    computeConfidenceScore(b.scoring.final, b.daysActive) -
    computeConfidenceScore(a.scoring.final, a.daysActive)
  );
  const topN = sorted.slice(0, N);

  const clientInTopN = topN.filter(a => a.isClientAd).length;
  const selectivityPct = merged.length > 0 ? Math.round((N / merged.length) * 100) : 0;

  const compBreakdown = new Map<string, number>();
  topN.forEach(ad => {
    const name = ad.isClientAd ? brandName : ad.competitorName;
    compBreakdown.set(name, (compBreakdown.get(name) || 0) + 1);
  });

  const totalCompetitors = new Set(allAds.filter(a => !a.isClientAd).map(a => a.competitorName)).size;
  const expectedShare = totalCompetitors > 0 ? N / (totalCompetitors + 1) : N / 2;
  const actualShare = clientInTopN;

  const rawSeverity = Math.min(100, Math.max(0, Math.round((1 - actualShare / expectedShare) * 100)));
  if (rawSeverity < 20) return null;

  // Ensure client brand always appears in ranking breakdown
  if (!compBreakdown.has(brandName)) {
    compBreakdown.set(brandName, 0);
  }

  const rows = Array.from(compBreakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      cells: [
        name === brandName ? `${name} (You)` : name,
        `${count} of ${N}`,
        `${Math.round((count / N) * 100)}%`,
      ],
      highlight: name === brandName,
    }));

  return {
    id: 'signal-quality',
    category: 'quality',
    headline: `${brandName} holds ${clientInTopN} of the top ${N} highest-scoring ads`,
    detail: `The top ${N} represents the top ${selectivityPct}% of all ${merged.length} ads analyzed — these are the ads competitors are actually scaling. ${brandName} captures ${clientInTopN} of those ${N} slots. With ${totalCompetitors} competitors, an equal share would be ~${Math.round(expectedShare)}. A low presence in the top tier suggests your creatives may need stronger hooks, better production value, or improved offer framing.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      rows,
      statValue: `${clientInTopN} of ${N}`,
      statContext: `Top ${selectivityPct}% of ${merged.length} ads analyzed`,
    },
    visualType: 'comparison_table',
  };
}

function computeFormatBlindspot(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  const industryDist = calculateFormatDistribution(allAds);
  const clientDist = calculateFormatDistribution(clientAds);

  const blindspots: { format: string; industryPct: number; clientPct: number }[] = [];
  industryDist.forEach(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    if (ind.value >= 20 && clientPct === 0) {
      blindspots.push({ format: ind.name, industryPct: ind.value, clientPct });
    }
  });

  if (blindspots.length === 0) return null;

  const rawSeverity = Math.min(100, blindspots.length * 30 + 20);

  const rows = industryDist.map(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    const isBlindspot = ind.value >= 20 && clientPct === 0;
    return {
      cells: [ind.name, `${ind.value}%`, `${clientPct}%`],
      highlight: isBlindspot,
    };
  });

  const missingFormats = blindspots.map(b => b.format).join(', ');

  return {
    id: 'signal-format',
    category: 'format',
    headline: `${brandName} has zero ads in ${missingFormats} — a format competitors rely on`,
    detail: `The industry invests heavily in formats you're not using at all. ${missingFormats} represent${blindspots.length === 1 ? 's' : ''} a significant share of competitor ad spend. Testing these formats could unlock new audience segments and improve creative diversification.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      rows,
      statValue: `${blindspots.length} blind spot${blindspots.length !== 1 ? 's' : ''}`,
      statContext: `Popular ad formats your competitors run that you don't`,
    },
    visualType: 'comparison_table',
  };
}

function computeVelocityMismatch(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  const industryDist = calculateSignalDistribution(allAds);

  // Competitor-only signal when no client ads are available
  if (clientAds.length === 0) {
    const industryScaling = industryDist.find(d => d.name === 'Scaling');
    const industryScalingPct = industryScaling?.value ?? 0;
    if (industryScalingPct < 5) return null;

    const rows = industryDist.map(ind => ({
      cells: [ind.name, `${ind.value}%`, 'N/A'],
      highlight: ind.name === 'Scaling',
    }));

    return {
      id: 'signal-velocity',
      category: 'velocity',
      headline: `${industryScalingPct}% of competitor ads are Scaling — their proven winners`,
      detail: `Scaling ads — high-performing creatives that brands invest in aggressively — make up ${industryScalingPct}% of competitor ads in your industry. Connect your Meta account to see how your velocity distribution compares.`,
      severity: normalizeSeverity(40),
      dataPoints: {
        rows,
        statValue: `${industryScalingPct}% Scaling`,
        statContext: `Industry velocity distribution`,
      },
      visualType: 'comparison_table',
    };
  }

  const clientDist = calculateSignalDistribution(clientAds);

  const industryScaling = industryDist.find(d => d.name === 'Scaling');
  const clientScaling = clientDist.find(d => d.name === 'Scaling');

  const industryScalingPct = industryScaling?.value ?? 0;
  const clientScalingPct = clientScaling?.value ?? 0;
  const deficit = industryScalingPct - clientScalingPct;

  if (deficit < 10) return null;

  const rawSeverity = Math.min(100, Math.max(0, Math.round(deficit * 1.5)));

  const rows = industryDist.map(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    return {
      cells: [ind.name, `${ind.value}%`, `${clientPct}%`],
      highlight: ind.name === 'Scaling',
    };
  });

  return {
    id: 'signal-velocity',
    category: 'velocity',
    headline: `${brandName} has ${clientScalingPct}% Scaling ads vs. ${industryScalingPct}% industry average`,
    detail: `Scaling ads — high-performing creatives that brands invest in aggressively — make up ${industryScalingPct}% of the industry but only ${clientScalingPct}% of your ads. This gap of ${deficit} percentage points suggests your creative testing pipeline may not be surfacing winners effectively, or winning ads aren't being scaled.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      rows,
      statValue: `${clientScalingPct}% Scaling`,
      statContext: `Industry average: ${industryScalingPct}%`,
    },
    visualType: 'comparison_table',
  };
}

function computeTrendGaps(data: ReportData, brandName: string): StorySignal | null {
  if (data.trends.length === 0) return null;

  const criticalGaps = data.trends.filter(t =>
    t.hasGap && (t.gapDetails?.severity === 'critical' || t.gapDetails?.severity === 'high')
  );
  const allGaps = data.trends.filter(t => t.hasGap);

  if (allGaps.length === 0) return null;

  const rawSeverity = Math.min(100, Math.max(20, criticalGaps.length * 25 + allGaps.length * 10));

  const rows = data.trends.slice(0, 8).map(t => ({
    cells: [
      t.trendName,
      `${t.evidence.competitorCount} competitors`,
      t.hasGap ? 'Missing' : 'Present',
    ],
    highlight: !!t.hasGap,
  }));

  return {
    id: 'signal-trend',
    category: 'trend',
    headline: `${brandName} is missing ${allGaps.length} trending pattern${allGaps.length !== 1 ? 's' : ''} competitors are using`,
    detail: `${criticalGaps.length} critical/high and ${allGaps.length - criticalGaps.length} additional trend gaps were detected. These are creative patterns adopted by multiple competitors that ${brandName} hasn't yet tested. Early adoption of emerging trends can provide a first-mover advantage in audience attention.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      rows,
      criticalGaps: criticalGaps.length,
      totalGaps: allGaps.length,
      statValue: `${allGaps.length} gap${allGaps.length !== 1 ? 's' : ''}`,
      statContext: `${criticalGaps.length} critical/high, ${allGaps.length - criticalGaps.length} moderate/minor`,
    },
    visualType: 'comparison_table',
  };
}

function computeCreativePatterns(data: ReportData, brandName: string): StorySignal | null {
  if (!data.hookAnalysis && !data.playbook) return null;

  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  const industryDist = calculateHookTypeDistribution(allAds);
  const clientDist = calculateHookTypeDistribution(clientAds);

  const gaps: { name: string; industryPct: number; clientPct: number; deficit: number }[] = [];
  industryDist.forEach(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    const deficit = ind.value - clientPct;
    if (ind.value >= 15 && deficit >= 10) {
      gaps.push({ name: ind.name, industryPct: ind.value, clientPct, deficit });
    }
  });

  if (gaps.length === 0) return null;

  const rawSeverity = Math.min(100, Math.max(20, gaps.reduce((sum, g) => sum + g.deficit, 0)));

  const rows = industryDist.map(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    const isGap = gaps.some(g => g.name === ind.name);
    return {
      cells: [ind.name, `${ind.value}%`, `${clientPct}%`],
      highlight: isGap,
    };
  });

  const missingTypes = gaps.map(g => g.name).join(', ');

  return {
    id: 'signal-creative',
    category: 'creative',
    headline: `${brandName} underuses ${missingTypes} hooks that competitors lean on`,
    detail: `Top-performing ads in your industry rely on hook types that ${brandName} rarely uses. Diversifying your hook strategy to include ${missingTypes.toLowerCase()} approaches could improve thumb-stop rate and creative win rate.`,
    severity: normalizeSeverity(rawSeverity),
    dataPoints: {
      rows,
      statValue: `${gaps.length} underused pattern${gaps.length !== 1 ? 's' : ''}`,
      statContext: `Proven hook styles your competitors use that you don't`,
    },
    visualType: 'comparison_table',
  };
}

// --- Main report computation ---

export function computeReport(data: ReportData): ComputedReport {
  const { allAds, clientAds, competitors, clientBrand } = data;
  const brandName = clientBrand.name;

  const competitorMap = new Map<string, { count: number; logo: string }>();
  allAds.forEach(ad => {
    if (ad.isClientAd) return;
    const existing = competitorMap.get(ad.competitorName);
    if (existing) existing.count++;
    else competitorMap.set(ad.competitorName, { count: 1, logo: ad.competitorLogo });
  });

  const signals = [
    computeVolumeGap(data, brandName),
    computeTopAdsAbsence(data, brandName),
    computeFormatBlindspot(data, brandName),
    computeVelocityMismatch(data, brandName),
    computeTrendGaps(data, brandName),
    computeCreativePatterns(data, brandName),
  ].filter((s): s is StorySignal => s !== null && s.severity >= 2)
   .sort((a, b) => b.severity - a.severity);

  return {
    signals,
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
      competitorAdsCount: allAds.filter(ad => !ad.isClientAd).length,
      competitorCount: competitors.length,
      clientAdsCount: clientAds.length,
      metaConnected: clientAds.length > 0,
      generatedAt: new Date().toISOString(),
      brandName: clientBrand.name,
      industry: clientBrand.industry,
    },
  };
}

// --- Report validation ---

export interface ReportValidationError {
  field: string;
  message: string;
  expected: number;
  actual: number;
}

function sumDistribution(items: DistributionItem[]): number {
  return items.reduce((s, i) => s + i.value, 0);
}

export function validateReport(report: ComputedReport): ReportValidationError[] {
  const errors: ReportValidationError[] = [];
  const { metadata, perCompetitorCounts, distributions } = report;

  // totalAds === competitorAdsCount + clientAdsCount
  const expectedTotal = metadata.competitorAdsCount + metadata.clientAdsCount;
  if (metadata.totalAds !== expectedTotal) {
    errors.push({
      field: 'metadata.totalAds',
      message: `totalAds (${metadata.totalAds}) !== competitorAdsCount (${metadata.competitorAdsCount}) + clientAdsCount (${metadata.clientAdsCount})`,
      expected: expectedTotal,
      actual: metadata.totalAds,
    });
  }

  // sum(perCompetitorCounts) === competitorAdsCount
  const competitorSum = perCompetitorCounts.reduce((s, c) => s + c.count, 0);
  if (competitorSum !== metadata.competitorAdsCount) {
    errors.push({
      field: 'perCompetitorCounts',
      message: `sum of perCompetitorCounts (${competitorSum}) !== competitorAdsCount (${metadata.competitorAdsCount})`,
      expected: metadata.competitorAdsCount,
      actual: competitorSum,
    });
  }

  // Each non-empty distribution must sum to 100
  const distEntries: [string, DistributionItem[]][] = [
    ['distributions.format', distributions.format],
    ['distributions.velocity', distributions.velocity],
    ['distributions.signal', distributions.signal],
    ['distributions.grade', distributions.grade],
    ['distributions.hookType', distributions.hookType],
  ];

  for (const [name, items] of distEntries) {
    if (items.some(i => i.value > 0)) {
      const sum = sumDistribution(items);
      if (sum !== 100) {
        errors.push({
          field: name,
          message: `${name} sums to ${sum}, expected 100`,
          expected: 100,
          actual: sum,
        });
      }
    }
  }

  return errors;
}
