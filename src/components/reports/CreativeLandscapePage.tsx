import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { PDFBarChart } from './shared/PDFBarChart';
import { ComparisonTable } from './shared/ComparisonTable';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel } from '@/lib/reports/creative-labels';

const s = StyleSheet.create({
  subtitle: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 16,
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
});

interface Props {
  velocity: CreativeIntelligenceData['velocity'];
  branding: ReportBranding;
  rawPrevalence?: CreativeIntelligenceData['rawPrevalence'];
}

export function CreativeLandscapePage({ velocity, branding, rawPrevalence }: Props) {
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
      }))
    : top8.map((el) => ({
        label: formatDimensionLabel(el.dimension, el.value),
        value: el.currentPrevalence,
        color: el.velocityPercent > 0 ? colors.success : el.velocityPercent < 0 ? colors.muted : colors.accent,
      }));

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
    ? `The biggest creative divergence is in ${biggestDivergence.dimension}: "${biggestDivergence.value}" — Track A (consolidators) at ${Math.round(biggestDivergence.trackAPrevalence)}% vs Track B (velocity testers) at ${Math.round(biggestDivergence.trackBPrevalence)}%. This ${Math.round(biggestDivergence.divergencePercent)}% gap suggests different strategic approaches to this element.`
    : 'Track A and Track B creative strategies are largely aligned, suggesting industry consensus on current creative patterns.';

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Creative Landscape Overview" branding={branding} />
      <Text style={s.subtitle}>
        Track A (consolidators) vs Track B (velocity testers) creative patterns
      </Text>

      <Text style={s.sectionLabel}>Top Creative Elements</Text>
      <PDFBarChart data={barData} showPercentage unit="%" />

      {divergenceRows.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Track Divergences</Text>
          <ComparisonTable
            headers={['Element', 'Track A', 'Track B', 'Divergence']}
            rows={divergenceRows}
            columnWidths={[40, 20, 20, 20]}
          />
        </>
      )}

      <View style={s.insightBox}>
        <Text style={s.insightLabel}>KEY INSIGHT</Text>
        <Text style={s.insightText}>{insightText}</Text>
      </View>

      <ReportFooter branding={branding} />
    </Page>
  );
}
