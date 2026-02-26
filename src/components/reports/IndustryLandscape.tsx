import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ComputedReport, ReportBranding } from '@/types/report';
import { DistributionItem } from '@/lib/analytics';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { PDFBarChart } from './shared/PDFBarChart';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  section: {
    marginBottom: 24,
  },
  rankText: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 8,
  },
});

function hasNonZeroDistribution(items: DistributionItem[]): boolean {
  return items.length > 0 && items.some(d => d.value > 0);
}

interface Props {
  report: ComputedReport;
  brandName: string;
  branding: ReportBranding;
}

export function IndustryLandscape({ report, brandName, branding }: Props) {
  const { perCompetitorCounts, distributions } = report;

  // Sort competitors by count desc
  const sorted = [...perCompetitorCounts].sort((a, b) => b.count - a.count);
  const brandRank = sorted.findIndex(c => c.name === brandName) + 1;

  const competitorBarData = sorted.map(c => ({
    label: c.name,
    value: c.count,
    highlight: c.name === brandName,
    color: c.name === brandName ? colors.accent : undefined,
  }));

  const signalBarData = distributions.signal.map(d => ({
    label: d.name,
    value: d.value,
    color: d.color,
  }));

  const formatBarData = distributions.format.map(d => ({
    label: d.name,
    value: d.value,
    color: d.color,
  }));

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Industry Landscape" branding={branding} />

      {/* Competitor Ad Volume */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Competitor Ad Volume</Text>
        <PDFBarChart data={competitorBarData} />
        {brandRank > 0 && (
          <Text style={s.rankText}>
            {brandName} ranks #{brandRank} of {sorted.length} by ad volume
          </Text>
        )}
      </View>

      {/* Ad Quality Breakdown */}
      {hasNonZeroDistribution(distributions.signal) && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ad Quality Breakdown</Text>
          <PDFBarChart data={signalBarData} unit="%" />
        </View>
      )}

      {/* Format Distribution */}
      {hasNonZeroDistribution(distributions.format) && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Format Distribution</Text>
          <PDFBarChart data={formatBarData} unit="%" />
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
