import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel } from '@/types/playbook';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  lead: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  card: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  stopPatternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  redIndicator: {
    width: 8,
    height: 8,
    backgroundColor: colors.danger,
  },
  patternName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  bodyText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  mutedText: {
    fontSize: 8,
    color: colors.muted,
  },
});

function ConfidencePill({ level, reason }: { level: ConfidenceLevel; reason?: string }) {
  const style =
    level === 'high' ? sharedStyles.confidenceHigh :
    level === 'medium' ? sharedStyles.confidenceMedium :
    sharedStyles.confidenceHypothesis;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={style}>{level.toUpperCase()}</Text>
      {reason && <Text style={{ fontSize: 8, color: colors.muted }}>{reason}</Text>}
    </View>
  );
}

interface Props {
  playbook: PlaybookContent;
  brandName: string;
  branding: ReportBranding;
}

export function StopDoing({ playbook, brandName, branding }: Props) {
  if (!playbook.stopDoing) return null;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Stop Doing" branding={branding} />

      <Text style={s.lead}>
        These patterns are hurting your performance. Cutting them frees budget for what works.
      </Text>

      <Text style={s.bodyText}>{playbook.stopDoing.summary}</Text>

      {playbook.stopDoing.patterns?.map((pattern, i) => (
        <View key={i} wrap={false}>
          {i > 0 && <View style={s.divider} />}
          <View style={s.card}>
            <View style={s.stopPatternRow}>
              <View style={s.redIndicator} />
              <Text style={s.patternName}>{pattern.pattern}</Text>
            </View>
            <Text style={s.bodyText}>{pattern.reason}</Text>
            <View style={s.twoColRow}>
              <Text style={[s.mutedText, { flex: 1 }]}>Your data: {pattern.yourData}</Text>
              <Text style={[s.mutedText, { flex: 1 }]}>Competitors: {pattern.competitorComparison}</Text>
            </View>
            <ConfidencePill level={pattern.confidence} reason={pattern.confidenceReason} />
          </View>
        </View>
      ))}

      <ReportFooter branding={branding} />
    </Page>
  );
}
