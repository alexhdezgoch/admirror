import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { StorySignal, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SignalDeepDive } from './SignalDeepDive';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  emptyBox: {
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
});

interface Props {
  signals: StorySignal[];
  brandName: string;
  branding: ReportBranding;
}

export function SignalDeepDivePages({ signals, brandName, branding }: Props) {
  if (signals.length === 0) {
    return (
      <Page size="A4" style={sharedStyles.page}>
        <ReportHeader title="Signal Deep Dives" branding={branding} />
        <View style={s.emptyBox}>
          <Text style={s.emptyTitle}>No Signals Detected</Text>
          <Text style={s.emptyText}>
            Signal analysis requires sufficient ad data from your brand and competitors.
            As more ads are collected, competitive intelligence signals will appear here
            with detailed breakdowns and actionable insights.
          </Text>
        </View>
        <ReportFooter branding={branding} />
      </Page>
    );
  }

  const topSignals = [...signals]
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Signal Deep Dives" branding={branding} />
      {topSignals.map(signal => (
        <SignalDeepDive
          key={signal.id}
          signal={signal}
          brandName={brandName}
          branding={branding}
        />
      ))}
      <ReportFooter branding={branding} />
    </Page>
  );
}
