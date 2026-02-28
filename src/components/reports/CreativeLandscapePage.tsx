import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { PDFBarChart } from './shared/PDFBarChart';
import { ComparisonTable } from './shared/ComparisonTable';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel, generateActionImplication } from '@/lib/reports/creative-labels';

const s = StyleSheet.create({
  subtitle: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 16,
  },
  introParagraph: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 12,
  },
  sampleSize: {
    fontSize: 7.5,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  insightBox: {
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  insightLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  // Market Momentum styles (from CreativeTrendsPage)
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  trendLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
  },
  velocityText: {
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 45,
    textAlign: 'right',
  },
  barTrack: {
    width: 100,
  },
  bar: {
    height: 10,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  // Convergence styles
  alertBox: {
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: colors.danger,
    marginBottom: 8,
  },
  convergenceBox: {
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
  },
  alertText: {
    fontSize: 8,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  actionImplication: {
    fontSize: 7.5,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 2,
    lineHeight: 1.3,
  },
});

interface Props {
  velocity: CreativeIntelligenceData['velocity'];
  branding: ReportBranding;
  rawPrevalence?: CreativeIntelligenceData['rawPrevalence'];
  clientPatterns?: CreativeIntelligenceData['clientPatterns'];
  metadata?: CreativeIntelligenceData['metadata'];
  competitorCount?: number;
  convergence?: CreativeIntelligenceData['convergence'];
}

export function CreativeLandscapePage({ velocity, branding, rawPrevalence, clientPatterns, metadata, competitorCount, convergence }: Props) {
  // Build a set of client pattern keys for highlighting
  const clientPatternKeys = new Set<string>();
  if (clientPatterns) {
    for (const cp of clientPatterns) {
      clientPatternKeys.add(`${cp.dimension}:${cp.value}`);
    }
  }

  // Top 8 elements by prevalence for bar chart
  const allElements = [
    ...velocity.topAccelerating,
    ...velocity.topDeclining,
  ];
  const uniqueElements = new Map<string, typeof allElements[0]>();
  for (const el of allElements) {
    const key = `${el.dimension}:${el.value}`;
    if (!uniqueElements.has(key) || el.currentPrevalence > uniqueElements.get(key)!.currentPrevalence) {
      uniqueElements.set(key, el);
    }
  }
  const top8 = Array.from(uniqueElements.values())
    .sort((a, b) => b.currentPrevalence - a.currentPrevalence)
    .slice(0, 8);

  // Fallback to rawPrevalence when velocity-based top8 is empty
  const useFallback = top8.length === 0 && rawPrevalence && rawPrevalence.length > 0;
  const fallbackData = useFallback
    ? [...rawPrevalence]
        .sort((a, b) => b.weightedPrevalence - a.weightedPrevalence)
        .slice(0, 10)
    : [];

  const barData = useFallback
    ? fallbackData.map((el) => ({
        label: formatDimensionLabel(el.dimension, el.value),
        value: el.weightedPrevalence,
        color: colors.accent,
        highlight: clientPatternKeys.has(`${el.dimension}:${el.value}`),
      }))
    : top8.map((el) => ({
        label: formatDimensionLabel(el.dimension, el.value),
        value: el.currentPrevalence,
        color: el.velocityPercent > 0 ? colors.success : el.velocityPercent < 0 ? colors.muted : colors.accent,
        highlight: clientPatternKeys.has(`${el.dimension}:${el.value}`),
      }));

  // "Your Creative DNA vs Market" comparison table
  const dnaRows: { cells: string[]; highlight: boolean }[] = [];
  if (clientPatterns && clientPatterns.length > 0 && rawPrevalence) {
    const marketMap = new Map<string, number>();
    for (const r of rawPrevalence) {
      marketMap.set(`${r.dimension}:${r.value}`, r.weightedPrevalence);
    }
    // Also check velocity data for market prevalence
    for (const el of [...velocity.topAccelerating, ...velocity.topDeclining]) {
      const key = `${el.dimension}:${el.value}`;
      if (!marketMap.has(key)) {
        marketMap.set(key, el.currentPrevalence);
      }
    }

    const rows = clientPatterns
      .map((cp) => {
        const marketPrev = marketMap.get(`${cp.dimension}:${cp.value}`) ?? 0;
        const marketPct = marketPrev * 100;
        const ratio = marketPct > 0 ? cp.prevalence / marketPct : cp.prevalence > 0 ? 999 : 1;
        let status: string;
        if (ratio >= 0.8 && ratio <= 1.2) {
          status = 'Aligned';
        } else if (ratio < 0.8) {
          status = 'Gap';
        } else {
          status = 'Ahead';
        }
        return {
          label: formatDimensionLabel(cp.dimension, cp.value),
          marketPrev,
          clientPrev: cp.prevalence,
          status,
        };
      })
      .sort((a, b) => b.marketPrev - a.marketPrev)
      .slice(0, 8);

    for (const row of rows) {
      dnaRows.push({
        cells: [
          row.label,
          `${Math.round(row.marketPrev * 100)}%`,
          `${Math.round(row.clientPrev)}%`,
          row.status,
        ],
        highlight: row.status === 'Gap',
      });
    }
  }

  // Divergence table
  const divergenceRows = velocity.trackDivergences.slice(0, 6).map((d) => ({
    cells: [
      formatDimensionLabel(d.dimension, d.value),
      `${Math.round(d.trackAPrevalence)}%`,
      `${Math.round(d.trackBPrevalence)}%`,
      `${Math.round(d.divergencePercent)}%`,
    ],
    highlight: d.divergencePercent > 25,
  }));

  // Auto-generated insight
  const biggestDivergence = velocity.trackDivergences[0];
  const insightText = biggestDivergence
    ? `The biggest creative divergence is in ${biggestDivergence.dimension}: "${biggestDivergence.value}" — Scaling-focused competitors at ${Math.round(biggestDivergence.trackAPrevalence)}% vs Testing-focused competitors at ${Math.round(biggestDivergence.trackBPrevalence)}%. This ${Math.round(biggestDivergence.divergencePercent)}% gap suggests different strategic approaches to this element.`
    : 'Competitors using different strategies are converging on the same creative patterns, suggesting strong industry consensus.';

  const totalTaggedAds = metadata?.totalTaggedAds ?? 0;
  const compCount = competitorCount ?? metadata?.competitorCount ?? 0;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="What's Working in Your Industry" branding={branding} />
      <Text style={s.subtitle}>
        How scaling-focused and testing-focused competitors approach creative differently
      </Text>

      {totalTaggedAds > 0 && (
        <Text style={s.introParagraph}>
          We analyzed {totalTaggedAds} tagged ads across your competitive set to identify the creative patterns that are winning right now. The chart below shows the most prevalent creative elements — highlighted rows indicate patterns you already use.
        </Text>
      )}

      {(totalTaggedAds > 0 || compCount > 0) && (
        <Text style={s.sampleSize}>
          Based on {totalTaggedAds} tagged ads across {compCount} competitors
        </Text>
      )}

      <Text style={s.sectionLabel}>Top Creative Elements</Text>
      <PDFBarChart data={barData} showPercentage unit="%" />

      {dnaRows.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Your Creative DNA vs Market</Text>
          <ComparisonTable
            headers={['Element', 'Market Winners', 'Your Ads', 'Status']}
            rows={dnaRows}
            columnWidths={[35, 22, 22, 21]}
          />
        </>
      )}

      {divergenceRows.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Strategy Divergences</Text>
          <ComparisonTable
            headers={['Element', 'Scaling Strategy', 'Testing Strategy', 'Divergence']}
            rows={divergenceRows}
            columnWidths={[40, 20, 20, 20]}
          />
        </>
      )}

      <View style={s.insightBox}>
        <Text style={s.insightLabel}>KEY INSIGHT</Text>
        <Text style={s.insightText}>{insightText}</Text>
      </View>

      {/* Market Momentum (absorbed from CreativeTrendsPage) */}
      {(() => {
        const accelerating = velocity.topAccelerating.slice(0, 3);
        const declining = velocity.topDeclining.slice(0, 3);
        if (accelerating.length === 0 && declining.length === 0) return null;
        const maxP = Math.max(
          ...accelerating.map((r) => r.currentPrevalence),
          ...declining.map((r) => r.currentPrevalence),
          1
        );
        return (
          <>
            <Text style={s.sectionLabel}>Market Momentum</Text>
            {accelerating.length > 0 && accelerating.map((item, i) => (
              <View key={`acc-${i}`} style={[s.trendRow, { backgroundColor: '#f0fdf4' }]}>
                <Text style={s.trendLabel}>{formatDimensionLabel(item.dimension, item.value)}</Text>
                <Text style={[s.velocityText, { color: colors.success }]}>+{item.velocityPercent}%</Text>
                <View style={s.barTrack}>
                  <View style={[s.bar, { width: `${Math.max((item.currentPrevalence / maxP) * 100, 3)}%`, backgroundColor: colors.success }]} />
                </View>
              </View>
            ))}
            {declining.length > 0 && (
              <>
                <View style={s.divider} />
                {declining.map((item, i) => (
                  <View key={`dec-${i}`} style={[s.trendRow, { backgroundColor: '#fafafa' }]}>
                    <Text style={s.trendLabel}>{formatDimensionLabel(item.dimension, item.value)}</Text>
                    <Text style={[s.velocityText, { color: colors.muted }]}>{item.velocityPercent}%</Text>
                    <View style={s.barTrack}>
                      <View style={[s.bar, { width: `${Math.max((item.currentPrevalence / maxP) * 100, 3)}%`, backgroundColor: colors.muted }]} />
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        );
      })()}

      {/* Convergence Alerts (absorbed from CreativeTrendsPage) */}
      {convergence && (convergence.newAlerts.length > 0 || convergence.strongConvergences.length > 0) && (
        <>
          <Text style={s.sectionLabel}>Convergence Alerts</Text>
          {(() => {
            const newAlertKeys = new Set(
              convergence.newAlerts.map((a) => `${a.dimension}:${a.value}`)
            );
            const dedupedConvergences = convergence.strongConvergences.filter(
              (c) => !newAlertKeys.has(`${c.dimension}:${c.value}`)
            );
            const combined = [
              ...convergence.newAlerts.map((a) => ({ ...a, badge: 'NEW' as const })),
              ...dedupedConvergences.map((c) => ({ ...c, badge: c.crossTrack ? 'CROSS-TRACK' as const : null })),
            ];
            const visible = combined.slice(0, 3);

            return visible.map((item, i) => (
              <View key={`conv-${i}`} style={item.badge === 'NEW' ? s.alertBox : s.convergenceBox}>
                <View style={s.alertHeaderRow}>
                  <Text style={s.alertTitle}>{formatDimensionLabel(item.dimension, item.value)}</Text>
                  {item.badge === 'NEW' && <SeverityBadge text="NEW" variant="critical" />}
                  {item.badge === 'CROSS-TRACK' && <SeverityBadge text="CROSS-TRACK" variant="info" />}
                </View>
                <Text style={s.alertText}>
                  {'competitorsIncreasing' in item
                    ? `${item.competitorsIncreasing} of ${item.totalCompetitors} competitors now using this — convergence ratio: ${Math.round(item.convergenceRatio * 100)}%`
                    : `Convergence ratio: ${Math.round(item.convergenceRatio * 100)}%`}
                </Text>
                <Text style={s.actionImplication}>
                  {generateActionImplication(item.dimension, item.value, item.convergenceRatio)}
                </Text>
              </View>
            ));
          })()}
        </>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
