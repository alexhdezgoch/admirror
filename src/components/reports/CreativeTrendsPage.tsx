import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel, generateActionImplication } from '@/lib/reports/creative-labels';

const s = StyleSheet.create({
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
    marginBottom: 2,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 10,
  },
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
  alertsSection: {
    marginTop: 16,
  },
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
  clientIndicator: {
    fontSize: 7.5,
    marginTop: 2,
    lineHeight: 1.3,
  },
  emptyState: {
    fontSize: 8,
    color: colors.muted,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  rankedItem: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
});

interface Props {
  velocity: CreativeIntelligenceData['velocity'];
  convergence: CreativeIntelligenceData['convergence'];
  branding: ReportBranding;
  clientPatterns?: CreativeIntelligenceData['clientPatterns'];
  rawPrevalence?: CreativeIntelligenceData['rawPrevalence'];
  metadata?: CreativeIntelligenceData['metadata'];
}

export function CreativeTrendsPage({ velocity, convergence, branding, clientPatterns, rawPrevalence, metadata }: Props) {
  const accelerating = velocity.topAccelerating.slice(0, 5);
  const declining = velocity.topDeclining.slice(0, 5);
  const maxPrevalence = Math.max(
    ...accelerating.map((r) => r.currentPrevalence),
    ...declining.map((r) => r.currentPrevalence),
    1
  );

  // Build client pattern lookup for context indicators
  const clientPatternMap = new Map<string, number>();
  if (clientPatterns) {
    for (const cp of clientPatterns) {
      clientPatternMap.set(`${cp.dimension}:${cp.value}`, cp.prevalence);
    }
  }

  const bothEmpty = accelerating.length === 0 && declining.length === 0;

  // Top 10 from rawPrevalence for fallback when both are empty
  const rankedPrevalence = bothEmpty && rawPrevalence && rawPrevalence.length > 0
    ? [...rawPrevalence]
        .sort((a, b) => b.weightedPrevalence - a.weightedPrevalence)
        .slice(0, 10)
    : [];

  function renderClientIndicator(dimension: string, value: string) {
    if (!clientPatterns) return null;
    const key = `${dimension}:${value}`;
    const prev = clientPatternMap.get(key);
    if (prev !== undefined) {
      return (
        <Text style={[s.clientIndicator, { color: colors.success }]}>
          You currently use this pattern ({Math.round(prev)}% of your ads).
        </Text>
      );
    }
    return (
      <Text style={[s.clientIndicator, { color: colors.warning }]}>
        You don&apos;t currently use this pattern.
      </Text>
    );
  }

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Where the Market is Heading" branding={branding} />

      <Text style={s.introParagraph}>
        This page tracks how creative patterns are shifting over time. Elements gaining momentum signal where the market is heading, while declining patterns indicate what competitors are moving away from.
        {metadata?.snapshotCount && metadata.snapshotCount >= 2
          ? ` Based on ${metadata.snapshotCount} snapshots across ${metadata?.dimensionCount ?? 0} creative dimensions.`
          : ' Your first snapshot has been captured — trend velocity will appear after the next analysis.'}
      </Text>

      {metadata && (metadata.totalTaggedAds > 0 || metadata.competitorCount > 0) && (
        <Text style={s.sampleSize}>
          Tracking {metadata.dimensionCount} creative dimensions across {metadata.competitorCount} competitors
        </Text>
      )}

      {bothEmpty ? (
        <>
          {rankedPrevalence.length > 0 ? (
            <>
              <Text style={s.sectionLabel}>Most Common Creative Patterns</Text>
              <Text style={s.sectionSubtitle}>Top creative elements by market prevalence</Text>
              {rankedPrevalence.map((item, i) => (
                <Text key={i} style={s.rankedItem}>
                  {i + 1}. {formatDimensionLabel(item.dimension, item.value)} — {Math.round(item.weightedPrevalence)}%
                </Text>
              ))}
            </>
          ) : (
            <Text style={s.emptyState}>
              Trend direction requires two weekly analyses. Your first snapshot was captured — velocity data will appear in next week&apos;s report.
            </Text>
          )}
        </>
      ) : (
        <>
          {/* Accelerating */}
          <Text style={s.sectionLabel}>Accelerating</Text>
          <Text style={s.sectionSubtitle}>Creative elements gaining momentum across competitors</Text>
          {accelerating.length === 0 ? (
            <Text style={s.emptyState}>
              No accelerating patterns detected yet. Velocity data will appear after the next analysis.
            </Text>
          ) : (
            accelerating.map((item, i) => (
              <View key={i} style={[s.trendRow, { backgroundColor: '#f0fdf4' }]}>
                <Text style={s.trendLabel}>
                  {formatDimensionLabel(item.dimension, item.value)}
                </Text>
                <Text style={[s.velocityText, { color: colors.success }]}>
                  +{item.velocityPercent}%
                </Text>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.bar,
                      {
                        width: `${Math.max((item.currentPrevalence / maxPrevalence) * 100, 3)}%`,
                        backgroundColor: colors.success,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}

          <View style={s.divider} />

          {/* Declining */}
          <Text style={s.sectionLabel}>Declining</Text>
          <Text style={s.sectionSubtitle}>Elements competitors are moving away from</Text>
          {declining.length === 0 ? (
            <Text style={s.emptyState}>
              No declining patterns detected yet. Velocity data will appear after the next analysis.
            </Text>
          ) : (
            declining.map((item, i) => (
              <View key={i} style={[s.trendRow, { backgroundColor: '#fafafa' }]}>
                <Text style={s.trendLabel}>
                  {formatDimensionLabel(item.dimension, item.value)}
                </Text>
                <Text style={[s.velocityText, { color: colors.muted }]}>
                  {item.velocityPercent}%
                </Text>
                <View style={s.barTrack}>
                  <View
                    style={[
                      s.bar,
                      {
                        width: `${Math.max((item.currentPrevalence / maxPrevalence) * 100, 3)}%`,
                        backgroundColor: colors.muted,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          )}
        </>
      )}

      {/* Convergence Alerts */}
      {(convergence.newAlerts.length > 0 || convergence.strongConvergences.length > 0) && (
        <View style={s.alertsSection}>
          <Text style={s.sectionLabel}>Convergence Alerts</Text>
          <Text style={s.sectionSubtitle}>When multiple competitors adopt the same creative pattern, it signals market consensus</Text>

          {convergence.newAlerts.map((alert, i) => (
            <View key={`alert-${i}`} style={s.alertBox}>
              <View style={s.alertHeaderRow}>
                <Text style={s.alertTitle}>
                  {formatDimensionLabel(alert.dimension, alert.value)}
                </Text>
                <SeverityBadge text="NEW" variant="critical" />
              </View>
              <Text style={s.alertText}>
                Convergence ratio: {Math.round(alert.convergenceRatio * 100)}%
              </Text>
              <Text style={s.actionImplication}>
                {generateActionImplication(alert.dimension, alert.value, alert.convergenceRatio)}
              </Text>
              {renderClientIndicator(alert.dimension, alert.value)}
            </View>
          ))}

          {convergence.strongConvergences.slice(0, 4).map((conv, i) => (
            <View key={`conv-${i}`} style={s.convergenceBox}>
              <View style={s.alertHeaderRow}>
                <Text style={s.alertTitle}>
                  {formatDimensionLabel(conv.dimension, conv.value)}
                </Text>
                {conv.crossTrack && (
                  <SeverityBadge text="CROSS-TRACK" variant="info" />
                )}
              </View>
              <Text style={s.alertText}>
                {conv.competitorsIncreasing} of {conv.totalCompetitors} competitors now using this
                {' '} — convergence ratio: {Math.round(conv.convergenceRatio * 100)}%
              </Text>
              <Text style={s.actionImplication}>
                {generateActionImplication(conv.dimension, conv.value, conv.convergenceRatio)}
              </Text>
              {renderClientIndicator(conv.dimension, conv.value)}
            </View>
          ))}
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
