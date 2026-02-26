import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ComputedReport, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';

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

export function ReportCover({ report, brandName, industry, branding }: Props) {
  const { signals, metadata } = report;
  const hasSignals = signals.length > 0;
  const topSignal = hasSignals ? signals[0] : null;

  const signalFindings = signals.slice(0, 3);
  const fallbackFindings = [
    { id: 'fallback-1', headline: `${metadata.totalAds} ads analyzed across ${metadata.competitorCount} competitors — your competitive landscape is mapped` },
    { id: 'fallback-2', headline: `Creative pattern analysis is building — connect Meta for personalized gap insights` },
    { id: 'fallback-3', headline: `Trend velocity tracking begins with your first snapshot — directional data appears in next week's report` },
  ];
  const keyFindings = signalFindings.length >= 3
    ? signalFindings
    : [...signalFindings, ...fallbackFindings.slice(signalFindings.length)].slice(0, 3);

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
          <Text style={s.statValue}>{metadata.totalAds}</Text>
          <Text style={s.statLabel}>Total Ads Analyzed</Text>
        </View>
        <View style={s.statCol}>
          <Text style={s.statValue}>{metadata.competitorCount}</Text>
          <Text style={s.statLabel}>Competitors Tracked</Text>
        </View>
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
            Report generated with {metadata.totalAds} ads across {metadata.competitorCount} competitors.
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
