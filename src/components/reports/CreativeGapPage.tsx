import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { StatCallout } from './shared/StatCallout';
import { ComparisonTable } from './shared/ComparisonTable';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel } from '@/lib/reports/creative-labels';

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
    marginBottom: 10,
    marginTop: 16,
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderLeft: 3,
    borderLeftColor: colors.success,
    marginBottom: 12,
  },
  strengthRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 8,
    marginTop: 3,
  },
  strengthText: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
  recommendationBox: {
    backgroundColor: '#EEF2FF',
    borderLeft: 3,
    borderLeftColor: colors.accent,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  recommendationLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  recommendationText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  velocityIndicator: {
    fontSize: 8,
    fontWeight: 'bold',
  },
});

interface Props {
  gaps: NonNullable<CreativeIntelligenceData['gaps']>;
  brandName: string;
  branding: ReportBranding;
  metadata?: CreativeIntelligenceData['metadata'];
}

export function CreativeGapPage({ gaps, brandName, branding, metadata }: Props) {
  const velocityArrow = (dir: string) => {
    if (dir === 'accelerating') return '↑';
    if (dir === 'declining') return '↓';
    return '→';
  };

  const velocityColor = (dir: string) => {
    if (dir === 'accelerating') return colors.success;
    if (dir === 'declining') return colors.muted;
    return colors.textLight;
  };

  const gapRows = gaps.priorityGaps.slice(0, 5).map((g) => ({
    cells: [
      formatDimensionLabel(g.dimension, g.value),
      `${Math.round(g.clientPrevalence)}%`,
      `${Math.round(g.competitorPrevalence)}%`,
      `${Math.round(g.gapSize)}%`,
      `${velocityArrow(g.velocityDirection)} ${g.velocityDirection}`,
    ],
    highlight: g.gapSize > 20,
  }));

  const topRecommendations = gaps.priorityGaps
    .filter((g) => g.recommendation)
    .slice(0, 2);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Your Creative Gap Analysis" branding={branding} />

      <Text style={s.introParagraph}>
        This analysis compares your creative patterns against your competitors to identify where you&apos;re falling behind, where you&apos;re ahead, and where to focus next.
      </Text>

      {metadata && (metadata.totalClientAds > 0 || metadata.totalCompetitorAds > 0) && (
        <Text style={s.sampleSize}>
          Comparing {metadata.totalClientAds} of your ads against {metadata.totalCompetitorAds} competitor ads
        </Text>
      )}

      {/* Biggest Opportunity */}
      <StatCallout
        stat={gaps.summary.biggestOpportunity}
        context={`${gaps.summary.totalGapsIdentified} gaps identified between ${brandName} and competitors`}
        variant="warning"
      />

      {/* Priority Gaps Table */}
      <Text style={s.sectionLabel}>Priority Gaps</Text>
      <ComparisonTable
        headers={['Element', 'You', 'Competitors', 'Gap', 'Trend']}
        rows={gapRows}
        columnWidths={[30, 15, 20, 15, 20]}
      />

      {/* Your Strengths */}
      {gaps.strengths.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Your Strengths</Text>
          <View style={s.successBox}>
            {gaps.strengths.map((str, i) => (
              <View key={i} style={s.strengthRow}>
                <View style={s.bullet} />
                <Text style={s.strengthText}>
                  {formatDimensionLabel(str.dimension, str.value)} — You: {Math.round(str.clientPrevalence)}% vs Competitors: {Math.round(str.competitorPrevalence)}%
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Recommendations */}
      {topRecommendations.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Recommendations</Text>
          {topRecommendations.map((gap, i) => (
            <View key={i} style={s.recommendationBox}>
              <Text style={s.recommendationLabel}>
                {velocityArrow(gap.velocityDirection)}{' '}
                {formatDimensionLabel(gap.dimension, gap.value).toUpperCase()}
              </Text>
              <Text style={s.recommendationText}>{gap.recommendation}</Text>
            </View>
          ))}
        </>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
