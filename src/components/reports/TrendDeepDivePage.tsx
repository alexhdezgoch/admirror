import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { DetectedTrend } from '@/types/analysis';
import { Ad } from '@/types';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import { PDFAdExampleRow } from './shared/PDFAdExampleRow';
import { buildAdMap, findAdsByIds } from '@/lib/reports/ad-lookup';
import { calculateTrendSeverity } from '@/lib/analysis/severity';
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
  fieldLabel: {
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

const severityOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, minor: 3, aligned: 4 };

function sortTrends(trends: DetectedTrend[]): DetectedTrend[] {
  const gaps = trends.filter(t => t.hasGap);
  const aligned = trends.filter(t => !t.hasGap);

  gaps.sort((a, b) => {
    const sa = severityOrder[calculateTrendSeverity(a)] ?? 2;
    const sb = severityOrder[calculateTrendSeverity(b)] ?? 2;
    return sa - sb;
  });

  aligned.sort((a, b) => b.recencyScore - a.recencyScore);

  return [...gaps, ...aligned];
}

interface Props {
  trends: DetectedTrend[];
  branding: ReportBranding;
  allAds?: Ad[];
  totalAdsAnalyzed?: number;
}

export function TrendDeepDivePage({ trends, branding, allAds, totalAdsAnalyzed }: Props) {
  const sorted = sortTrends(trends);
  const totalAds = totalAdsAnalyzed ?? trends.reduce((sum, t) => sum + t.evidence.adCount, 0);
  const adMap = buildAdMap(allAds || []);

  // Split into Proven Patterns vs Emerging Signals
  const proven = sorted.filter(t => t.evidence.competitorCount >= 2 && (t.evidence.avgDaysActive ?? 0) >= 30);
  const emerging = sorted.filter(t => t.evidence.competitorCount < 2 || (t.evidence.avgDaysActive ?? 0) < 30);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Industry Trends Analysis" branding={branding} />
      <Text style={s.subtitle}>
        {trends.length} patterns detected across {totalAds} ads
      </Text>

      {proven.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Proven Patterns</Text>
          <Text style={s.sectionSubtitle}>Multi-competitor trends with 30+ days of sustained adoption</Text>
          {proven.map((trend, i) => (
            <View key={trend.trendName} wrap={false}>
              {i > 0 && <View style={s.divider} />}
              <TrendCard trend={trend} adMap={adMap} />
            </View>
          ))}
        </>
      )}

      {proven.length > 0 && emerging.length > 0 && <View style={s.divider} />}

      {emerging.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Emerging Signals</Text>
          <Text style={s.sectionSubtitle}>Early-stage patterns worth monitoring</Text>
          {emerging.map((trend, i) => (
            <View key={trend.trendName} wrap={false}>
              {i > 0 && <View style={s.divider} />}
              <TrendCard trend={trend} adMap={adMap} />
            </View>
          ))}
        </>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}

function TrendCard({ trend, adMap }: { trend: DetectedTrend; adMap: Map<string, Ad> }) {
  // Always recalculate severity deterministically from evidence data
  const severity = calculateTrendSeverity(trend);

  const competitorSentence = trend.evidence.competitorNames.length > 0
    ? `Used by ${trend.evidence.competitorNames.join(', ')}`
    : null;

  const sampleAds = trend.evidence.sampleAdIds?.length
    ? findAdsByIds(adMap, trend.evidence.sampleAdIds).slice(0, 3)
    : [];

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.headerRow}>
        <Text style={s.trendName}>{trend.trendName}</Text>
        <SeverityBadge text={trend.category} variant="info" />
        {trend.gapDetails && (
          <SeverityBadge text={severity.toUpperCase()} variant={severity} />
        )}
      </View>

      {/* Description */}
      <Text style={s.description}>{trend.description}</Text>

      {/* Signal Strength */}
      <Text style={s.evidenceStat}>
        <Text style={s.evidenceValue}>{trend.evidence.competitorCount}</Text> competitors
        {' • '}
        <Text style={s.evidenceValue}>{trend.evidence.adCount}</Text> ads
        {(trend.evidence.avgDaysActive ?? 0) > 0 && (
          <>{' • '}<Text style={s.evidenceValue}>{trend.evidence.avgDaysActive}+</Text> days avg</>
        )}
        {' • '}
        <Text style={s.evidenceValue}>{trend.evidence.avgScore.toFixed(1)}</Text> avg score
      </Text>

      {/* Why It Works */}
      <Text style={s.fieldLabel}>WHY IT WORKS</Text>
      <Text style={s.bodyText}>{trend.whyItWorks}</Text>

      {/* Who's Using It */}
      <Text style={s.fieldLabel}>WHO&apos;S USING IT</Text>
      {competitorSentence && <Text style={s.bodyText}>{competitorSentence}</Text>}

      {/* Sample ad thumbnails */}
      {sampleAds.length > 0 && (
        <PDFAdExampleRow
          ads={sampleAds.map(a => ({
            thumbnail: a.thumbnail,
            competitorName: a.competitorName,
          }))}
          label="EXAMPLE ADS"
        />
      )}

      {/* Gap / Aligned */}
      {trend.hasGap ? (
        <View style={s.gapBox}>
          <View style={s.gapTitleRow}>
            <Text style={s.gapTitle}>Gap Analysis</Text>
            {trend.gapDetails && (
              <SeverityBadge text={severity.toUpperCase()} variant={severity} />
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
              <Text style={s.fieldLabel}>HOW TO ADAPT</Text>
              <Text style={s.gapText}>{trend.adaptationRecommendation}</Text>
            </View>
          )}
        </View>
      ) : trend.hasGap === false ? (
        <View style={s.alignedBox}>
          <Text style={s.alignedText}>
            You&apos;re aligned with this trend. Your ads already incorporate this pattern effectively.
          </Text>
          {trend.clientGapAnalysis && (
            <Text style={[s.alignedText, { marginTop: 4, fontSize: 8 }]}>
              {trend.clientGapAnalysis}
            </Text>
          )}
        </View>
      ) : null}

      {/* Recommended Action */}
      <View style={s.actionBox}>
        <Text style={s.actionLabel}>&gt; RECOMMENDED ACTION</Text>
        <Text style={s.actionText}>{trend.recommendedAction}</Text>
      </View>
    </View>
  );
}
