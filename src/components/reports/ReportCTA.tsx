import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  headline: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtext: {
    fontSize: 10,
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  featureLine: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  footerBlock: {
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  mutedLine: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
});

interface Props {
  brandName: string;
  branding: ReportBranding;
}

export function ReportCTA({ branding }: Props) {
  const borderColor = branding.accentColor || colors.accent;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Next Steps" branding={branding} />

      <Text style={s.headline}>Want to go deeper?</Text>
      <Text style={s.subtext}>
        This report is a snapshot. Here&apos;s what continuous competitive intelligence looks like:
      </Text>

      <View style={[s.card, { borderLeft: 3, borderLeftColor: borderColor }]}>
        <Text style={s.cardTitle}>FULL PLATFORM ACCESS</Text>
        <Text style={s.featureLine}>{'•  '}Real-time competitor monitoring</Text>
        <Text style={s.featureLine}>{'•  '}Ad-by-ad analysis with AI scoring</Text>
        <Text style={s.featureLine}>{'•  '}Custom playbook generation on demand</Text>
        <Text style={s.featureLine}>{'•  '}Trend detection as patterns emerge</Text>
      </View>

      <View style={[s.card, { borderLeft: 3, borderLeftColor: borderColor }]}>
        <Text style={s.cardTitle}>QUARTERLY COMPETITIVE BENCHMARK</Text>
        <Text style={s.featureLine}>{'•  '}Deep industry analysis</Text>
        <Text style={s.featureLine}>{'•  '}Market positioning report</Text>
        <Text style={s.featureLine}>{'•  '}Strategic recommendations</Text>
        <Text style={s.featureLine}>{'•  '}Performance trend tracking</Text>
      </View>

      <View style={s.divider} />

      <View style={s.footerBlock}>
        <Text style={s.companyName}>{branding.companyName}</Text>
        <Text style={s.mutedLine}>{branding.websiteUrl}</Text>
        {branding.contactEmail && (
          <Text style={s.mutedLine}>{branding.contactEmail}</Text>
        )}
      </View>

      <ReportFooter branding={branding} />
    </Page>
  );
}
