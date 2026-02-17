import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DetectedTrend } from '@/types/analysis';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  subtitle: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  trendName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  description: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.muted,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  evidenceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  evidenceStat: {
    fontSize: 8,
    color: colors.muted,
  },
  evidenceValue: {
    fontWeight: 'bold',
    color: colors.text,
  },
  gapBox: {
    backgroundColor: '#fef2f2',
    borderLeft: 3,
    borderLeftColor: colors.danger,
    padding: 10,
    marginBottom: 8,
  },
  alignedBox: {
    backgroundColor: '#f0fdf4',
    borderLeft: 3,
    borderLeftColor: colors.success,
    padding: 10,
    marginBottom: 8,
  },
  gapTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  gapTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  gapText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 9,
    color: colors.danger,
    marginRight: 6,
    width: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  alignedText: {
    fontSize: 9,
    color: '#15803d',
    lineHeight: 1.5,
  },
  actionBox: {
    backgroundColor: '#EEF2FF',
    borderLeft: 3,
    borderLeftColor: '#4F46E5',
    padding: 10,
  },
  actionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
});

const severityOrder: Record<string, number> = { critical: 0, moderate: 1, minor: 2 };

function sortTrends(trends: DetectedTrend[]): DetectedTrend[] {
  const gaps = trends.filter(t => t.hasGap);
  const aligned = trends.filter(t => !t.hasGap);

  gaps.sort((a, b) => {
    const sa = severityOrder[a.gapDetails?.severity ?? 'minor'] ?? 2;
    const sb = severityOrder[b.gapDetails?.severity ?? 'minor'] ?? 2;
    return sa - sb;
  });

  aligned.sort((a, b) => b.recencyScore - a.recencyScore);

  return [...gaps, ...aligned];
}

interface Props {
  trends: DetectedTrend[];
  branding: ReportBranding;
}

export function TrendDeepDivePage({ trends, branding }: Props) {
  const sorted = sortTrends(trends);
  const totalAds = trends.reduce((sum, t) => sum + t.evidence.adCount, 0);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Industry Trends Analysis" branding={branding} />
      <Text style={s.subtitle}>
        {trends.length} patterns detected across {totalAds} ads
      </Text>

      {sorted.map((trend, i) => (
        <View key={trend.trendName} wrap={false}>
          {i > 0 && <View style={s.divider} />}
          <TrendCard trend={trend} />
        </View>
      ))}

      <ReportFooter branding={branding} />
    </Page>
  );
}

function TrendCard({ trend }: { trend: DetectedTrend }) {
  const competitorSentence = trend.evidence.competitorNames.length > 0
    ? `Used by ${trend.evidence.competitorNames.join(', ')}`
    : null;

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.trendName}>{trend.trendName}</Text>
        <SeverityBadge text={trend.category} variant="info" />
        {trend.hasGap && trend.gapDetails && (
          <SeverityBadge text={trend.gapDetails.severity.toUpperCase()} variant={trend.gapDetails.severity} />
        )}
      </View>

      {/* Description */}
      <Text style={s.description}>{trend.description}</Text>

      {/* Why It Works */}
      <Text style={s.sectionLabel}>WHY IT WORKS</Text>
      <Text style={s.bodyText}>{trend.whyItWorks}</Text>

      {/* Who's Using It */}
      <Text style={s.sectionLabel}>WHO&apos;S USING IT</Text>
      {competitorSentence && <Text style={s.bodyText}>{competitorSentence}</Text>}
      <View style={s.evidenceRow}>
        <Text style={s.evidenceStat}>
          <Text style={s.evidenceValue}>{trend.evidence.adCount}</Text> ads
        </Text>
        <Text style={s.evidenceStat}>
          <Text style={s.evidenceValue}>{trend.evidence.competitorCount}</Text> competitors
        </Text>
        <Text style={s.evidenceStat}>
          avg score <Text style={s.evidenceValue}>{trend.evidence.avgScore.toFixed(1)}</Text>
        </Text>
      </View>

      {/* Gap / Aligned */}
      {trend.hasGap ? (
        <View style={s.gapBox}>
          <View style={s.gapTitleRow}>
            <Text style={s.gapTitle}>Gap Analysis</Text>
            {trend.gapDetails && (
              <SeverityBadge text={trend.gapDetails.severity.toUpperCase()} variant={trend.gapDetails.severity} />
            )}
          </View>
          {trend.clientGapAnalysis && (
            <Text style={s.gapText}>{trend.clientGapAnalysis}</Text>
          )}
          {trend.gapDetails?.missingElements && trend.gapDetails.missingElements.length > 0 && (
            <View style={{ marginBottom: 6 }}>
              {trend.gapDetails.missingElements.map((el) => (
                <View key={el} style={s.bulletItem}>
                  <Text style={s.bulletDot}>•</Text>
                  <Text style={s.bulletText}>{el}</Text>
                </View>
              ))}
            </View>
          )}
          {trend.adaptationRecommendation && (
            <View>
              <Text style={s.sectionLabel}>HOW TO ADAPT</Text>
              <Text style={s.gapText}>{trend.adaptationRecommendation}</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={s.alignedBox}>
          <Text style={s.alignedText}>
            You&apos;re aligned with this trend. Your ads already incorporate this pattern effectively.
          </Text>
        </View>
      )}

      {/* Recommended Action */}
      <View style={s.actionBox}>
        <Text style={s.actionLabel}>▶ RECOMMENDED ACTION</Text>
        <Text style={s.actionText}>{trend.recommendedAction}</Text>
      </View>
    </View>
  );
}
