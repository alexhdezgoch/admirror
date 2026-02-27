import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ComputedReport, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';
// v2 — data-driven fallbacks

const s = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  brand: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
  },
  industry: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 20,
  },
  snapshotBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
  },
  statCol: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 9,
    color: colors.muted,
  },
  gutPunchDetail: {
    fontSize: 10,
    color: '#c7d2fe',
    marginTop: 6,
  },
  neutralBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  neutralText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  findingsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  findingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  findingNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  findingText: {
    flex: 1,
    fontSize: 10,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  emptyFindings: {
    fontSize: 9,
    color: colors.muted,
    fontStyle: 'italic',
  },
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface Props {
  report: ComputedReport;
  brandName: string;
  industry: string;
  branding: ReportBranding;
}

function generateDataFallbacks(report: ComputedReport, brandName: string): { id: string; headline: string }[] {
  const { metadata, perCompetitorCounts, distributions } = report;
  const fallbacks: { id: string; headline: string }[] = [];

  // 1. Competitor dominance: "[Competitor] dominates with X% of competitor ads — Y ads running 60+ days"
  if (perCompetitorCounts.length > 0) {
    const top = perCompetitorCounts[0];
    const topPct = metadata.competitorAdsCount > 0
      ? Math.round((top.count / metadata.competitorAdsCount) * 100)
      : 0;
    fallbacks.push({
      id: 'data-competitor-dominance',
      headline: `${top.name} dominates with ${topPct}% of competitor ads — ${top.count} ads tracked across ${metadata.competitorCount} competitors`,
    });
  }

  // 2. Top format insight: "[Format] is the dominant ad format at X% of all ads"
  if (distributions.format.length > 0) {
    const sorted = [...distributions.format].sort((a, b) => b.value - a.value);
    const topFormat = sorted[0];
    if (topFormat.value > 0) {
      const runner = sorted[1];
      const headline = runner && runner.value > 0
        ? `${topFormat.name} leads ad formats at ${topFormat.value}% — followed by ${runner.name} at ${runner.value}%`
        : `${topFormat.name} dominates ad formats at ${topFormat.value}% of all competitor ads`;
      fallbacks.push({ id: 'data-format-leader', headline });
    }
  }

  // 3. Hook type insight: "[Hook type] hooks are the most common at X% of ads"
  if (distributions.hookType.length > 0) {
    const sorted = [...distributions.hookType].sort((a, b) => b.value - a.value);
    const topHook = sorted[0];
    if (topHook.value > 0) {
      fallbacks.push({
        id: 'data-hook-leader',
        headline: `${topHook.name} hooks lead the market at ${topHook.value}% of all competitor ads`,
      });
    }
  }

  // 4. Scaling velocity: "X% of competitor ads are in Scaling status — proven long-runners"
  if (distributions.signal.length > 0) {
    const scaling = distributions.signal.find(d => d.name === 'Scaling');
    if (scaling && scaling.value > 0) {
      fallbacks.push({
        id: 'data-scaling',
        headline: `${scaling.value}% of competitor ads are Scaling — proven creatives competitors keep investing in`,
      });
    }
  }

  // 5. Grade distribution: "X% of competitor ads score A or B grade"
  if (distributions.grade.length > 0) {
    const topGrades = distributions.grade.filter(d => d.name === 'A' || d.name === 'B');
    const topGradePct = topGrades.reduce((sum, g) => sum + g.value, 0);
    if (topGradePct > 0) {
      fallbacks.push({
        id: 'data-grade',
        headline: `${topGradePct}% of competitor ads score A or B grade — the quality bar in your space`,
      });
    }
  }

  // 6. Landscape breadth (catch-all if above produced nothing)
  if (fallbacks.length === 0) {
    fallbacks.push({
      id: 'data-landscape',
      headline: `${metadata.competitorAdsCount} competitor ads analyzed across ${metadata.competitorCount} competitors — your competitive landscape is mapped`,
    });
  }

  return fallbacks;
}

export function ReportCover({ report, brandName, industry, branding }: Props) {
  const { signals, metadata } = report;
  const hasSignals = signals.length > 0;
  const topSignal = hasSignals ? signals[0] : null;

  const signalFindings = signals.slice(0, 3);
  const dataFallbacks = generateDataFallbacks(report, brandName);
  const keyFindings = signalFindings.length >= 3
    ? signalFindings
    : [...signalFindings, ...dataFallbacks.slice(0, 3 - signalFindings.length)].slice(0, 3);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Competitive Intelligence Report" branding={branding} />

      {/* Title block */}
      <Text style={s.title}>COMPETITIVE INTELLIGENCE REPORT</Text>
      <Text style={s.brand}>{brandName}</Text>
      <Text style={s.industry}>{industry}</Text>
      <Text style={s.date}>{formatDate(metadata.generatedAt)}</Text>

      {/* Snapshot box */}
      <View style={s.snapshotBox}>
        <View style={s.statCol}>
          <Text style={s.statValue}>{metadata.competitorAdsCount}</Text>
          <Text style={s.statLabel}>Competitor Ads Analyzed</Text>
        </View>
        <View style={s.statCol}>
          <Text style={s.statValue}>{metadata.competitorCount}</Text>
          <Text style={s.statLabel}>Competitors Tracked</Text>
        </View>
        {metadata.clientAdsCount > 0 && (
          <View style={s.statCol}>
            <Text style={s.statValue}>{metadata.clientAdsCount}</Text>
            <Text style={s.statLabel}>Your Ads Included</Text>
          </View>
        )}
      </View>

      {/* Gut-punch or neutral box */}
      {topSignal ? (
        <View style={sharedStyles.gutPunchBox}>
          <Text style={sharedStyles.gutPunchText}>{topSignal.headline}</Text>
          <Text style={s.gutPunchDetail}>{topSignal.detail}</Text>
        </View>
      ) : (
        <View style={s.neutralBox}>
          <Text style={s.neutralText}>
            Report generated with {metadata.competitorAdsCount} competitor ads across {metadata.competitorCount} competitors.
            Signal analysis will populate as more data is collected.
          </Text>
        </View>
      )}

      {/* Key Findings */}
      <Text style={s.findingsTitle}>Key Findings</Text>
      {keyFindings.map((finding, i) => (
        <View key={finding.id} style={s.findingRow}>
          <View style={s.findingCircle}>
            <Text style={s.findingNumber}>{i + 1}</Text>
          </View>
          <Text style={s.findingText}>{finding.headline}</Text>
        </View>
      ))}

      <ReportFooter branding={branding} />
    </Page>
  );
}
