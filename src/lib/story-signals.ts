import { ReportData, ComputedReport, StorySignal } from '@/types/report';
import {
  calculateFormatDistribution,
  calculateVelocityDistribution,
  calculateSignalDistribution,
  calculateGradeDistribution,
  calculateHookTypeDistribution,
} from '@/lib/analytics';
// --- Signal compute functions ---

function computeVolumeGap(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  // Build per-competitor counts, excluding "(Your Ads)" entries
  const compCounts = new Map<string, number>();
  allAds.forEach(ad => {
    if (ad.competitorName.includes('(Your Ads)')) return;
    compCounts.set(ad.competitorName, (compCounts.get(ad.competitorName) || 0) + 1);
  });

  if (compCounts.size === 0) return null;

  const counts = Array.from(compCounts.values());
  const avgCompetitorAds = counts.reduce((a, b) => a + b, 0) / counts.length;
  const clientAdCount = clientAds.length;

  // Build competitors array for bar chart (include brand entry)
  const competitors = Array.from(compCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  competitors.push({ name: brandName, count: clientAdCount });

  let severity: number;
  let headline: string;

  if (clientAdCount === 0 && compCounts.size > 0) {
    severity = 85;
    headline = `${brandName} has zero tracked ads while competitors average ${Math.round(avgCompetitorAds)}`;
  } else {
    severity = Math.min(100, Math.max(0, Math.round((1 - clientAdCount / avgCompetitorAds) * 100)));
    headline = `${brandName} runs ${clientAdCount} ads vs. industry average of ${Math.round(avgCompetitorAds)}`;
  }

  if (severity < 20) return null;

  return {
    id: 'signal-volume',
    category: 'volume',
    headline,
    detail: `Your brand has ${clientAdCount} active ads compared to an industry average of ${Math.round(avgCompetitorAds)} across ${compCounts.size} competitors. A lower ad volume can limit your share of voice and reduce the chances of finding winning creatives through testing.`,
    severity,
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

function computeTop100Absence(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  const merged = [...allAds, ...clientAds.filter(ca => !allAds.some(a => a.id === ca.id))];
  if (merged.length === 0) return null;

  const sorted = [...merged].sort((a, b) => b.scoring.final - a.scoring.final);
  const top100 = sorted.slice(0, 100);

  const clientInTop100 = top100.filter(a => a.isClientAd).length;

  // Per-competitor breakdown
  const compBreakdown = new Map<string, number>();
  top100.forEach(ad => {
    const name = ad.isClientAd ? brandName : ad.competitorName;
    compBreakdown.set(name, (compBreakdown.get(name) || 0) + 1);
  });

  const totalCompetitors = new Set(allAds.map(a => a.competitorName).filter(n => !n.includes('(Your Ads)'))).size;
  const expectedShare = totalCompetitors > 0 ? 100 / (totalCompetitors + 1) : 50;
  const actualShare = clientInTop100;

  const severity = Math.min(100, Math.max(0, Math.round((1 - actualShare / expectedShare) * 100)));
  if (severity < 20) return null;

  const rows = Array.from(compBreakdown.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      cells: [name, String(count), `${count}%`],
      highlight: name === brandName,
    }));

  return {
    id: 'signal-quality',
    category: 'quality',
    headline: `${brandName} holds ${clientInTop100} of the top 100 highest-scoring ads`,
    detail: `When all ads are ranked by composite score, ${brandName} captures ${clientInTop100}% of the top 100 slots. With ${totalCompetitors} competitors, an equal share would be ~${Math.round(expectedShare)}%. A low presence in the top tier suggests your creatives may need stronger hooks, better production value, or improved offer framing.`,
    severity,
    dataPoints: {
      rows,
      statValue: `${clientInTop100} of 100`,
      statContext: `Expected share: ~${Math.round(expectedShare)}%`,
    },
    visualType: 'comparison_table',
  };
}

function computeFormatBlindspot(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0) return null;

  const industryDist = calculateFormatDistribution(allAds);
  const clientDist = calculateFormatDistribution(clientAds);

  // Find formats where industry >= 20% but client is at 0%
  const blindspots: { format: string; industryPct: number; clientPct: number }[] = [];
  industryDist.forEach(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    if (ind.value >= 20 && clientPct === 0) {
      blindspots.push({ format: ind.name, industryPct: ind.value, clientPct });
    }
  });

  if (blindspots.length === 0) return null;

  const severity = Math.min(100, blindspots.length * 30 + 20);

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
    severity,
    dataPoints: {
      rows,
      statValue: `${blindspots.length} blind spot${blindspots.length !== 1 ? 's' : ''}`,
      statContext: `Formats with ≥20% industry adoption where you have 0%`,
    },
    visualType: 'comparison_table',
  };
}

function computeVelocityMismatch(data: ReportData, brandName: string): StorySignal | null {
  const { allAds, clientAds } = data;
  if (allAds.length === 0 || clientAds.length === 0) return null;

  const industryDist = calculateSignalDistribution(allAds);
  const clientDist = calculateSignalDistribution(clientAds);

  // Focus on cash cow deficit
  const industryCashCow = industryDist.find(d => d.name === 'Cash Cow');
  const clientCashCow = clientDist.find(d => d.name === 'Cash Cow');

  const industryCashCowPct = industryCashCow?.value ?? 0;
  const clientCashCowPct = clientCashCow?.value ?? 0;
  const deficit = industryCashCowPct - clientCashCowPct;

  if (deficit < 10) return null;

  const severity = Math.min(100, Math.max(0, Math.round(deficit * 1.5)));

  const rows = industryDist.map(ind => {
    const clientItem = clientDist.find(c => c.name === ind.name);
    const clientPct = clientItem?.value ?? 0;
    return {
      cells: [ind.name, `${ind.value}%`, `${clientPct}%`],
      highlight: ind.name === 'Cash Cow',
    };
  });

  return {
    id: 'signal-velocity',
    category: 'velocity',
    headline: `${brandName} has ${clientCashCowPct}% Cash Cows vs. ${industryCashCowPct}% industry average`,
    detail: `Cash Cow ads — high-performing creatives that brands scale aggressively — make up ${industryCashCowPct}% of the industry but only ${clientCashCowPct}% of your ads. This gap of ${deficit} percentage points suggests your creative testing pipeline may not be surfacing winners effectively, or winning ads aren't being scaled.`,
    severity,
    dataPoints: {
      rows,
      statValue: `${clientCashCowPct}% Cash Cows`,
      statContext: `Industry average: ${industryCashCowPct}%`,
    },
    visualType: 'comparison_table',
  };
}

function computeTrendGaps(data: ReportData, brandName: string): StorySignal | null {
  if (data.trends.length === 0) return null;

  const criticalGaps = data.trends.filter(t => t.hasGap && t.gapDetails?.severity === 'critical');
  const allGaps = data.trends.filter(t => t.hasGap);

  if (allGaps.length === 0) return null;

  const severity = Math.min(100, Math.max(20, criticalGaps.length * 25 + allGaps.length * 10));

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
    detail: `${criticalGaps.length} critical and ${allGaps.length - criticalGaps.length} additional trend gaps were detected. These are creative patterns adopted by multiple competitors that ${brandName} hasn't yet tested. Early adoption of emerging trends can provide a first-mover advantage in audience attention.`,
    severity,
    dataPoints: {
      rows,
      statValue: `${allGaps.length} gap${allGaps.length !== 1 ? 's' : ''}`,
      statContext: `${criticalGaps.length} critical, ${allGaps.length - criticalGaps.length} moderate/minor`,
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

  // Find hook types with significant industry usage where client is underrepresented
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

  const severity = Math.min(100, Math.max(20, gaps.reduce((sum, g) => sum + g.deficit, 0)));

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
    severity,
    dataPoints: {
      rows,
      statValue: `${gaps.length} underused pattern${gaps.length !== 1 ? 's' : ''}`,
      statContext: `Hook types with ≥15% industry use where you trail by ≥10%`,
    },
    visualType: 'comparison_table',
  };
}

// --- Main report computation ---

export function computeReport(data: ReportData): ComputedReport {
  const { allAds, clientAds, competitors, clientBrand } = data;
  const brandName = clientBrand.name;

  // Group ads by competitor
  const competitorMap = new Map<string, { count: number; logo: string }>();
  allAds.forEach(ad => {
    const existing = competitorMap.get(ad.competitorName);
    if (existing) existing.count++;
    else competitorMap.set(ad.competitorName, { count: 1, logo: ad.competitorLogo });
  });

  const signals = [
    computeVolumeGap(data, brandName),
    computeTop100Absence(data, brandName),
    computeFormatBlindspot(data, brandName),
    computeVelocityMismatch(data, brandName),
    computeTrendGaps(data, brandName),
    computeCreativePatterns(data, brandName),
  ].filter((s): s is StorySignal => s !== null && s.severity >= 20)
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
      competitorCount: competitors.length,
      clientAdsCount: clientAds.length,
      metaConnected: clientAds.length > 0,
      generatedAt: new Date().toISOString(),
      brandName: clientBrand.name,
      industry: clientBrand.industry,
    },
  };
}
