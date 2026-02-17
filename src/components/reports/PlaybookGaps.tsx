import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel, CompetitorOpportunity } from '@/types/playbook';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  mutedText: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 8,
  },
  indigoBox: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
  },
  indigoText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
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
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
});

const severityOrder: Record<CompetitorOpportunity['gapSeverity'], number> = {
  critical: 0,
  moderate: 1,
  minor: 2,
};

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

export function PlaybookGaps({ playbook, brandName, branding }: Props) {
  const sortedOpportunities = playbook.competitorGaps?.opportunities
    ? [...playbook.competitorGaps.opportunities].sort(
        (a, b) => severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity]
      )
    : [];

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Opportunities & Stop Doing" branding={branding} />

      {/* Section 1: Competitor Opportunities */}
      {playbook.competitorGaps && (
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>COMPETITOR OPPORTUNITIES</Text>
        <Text style={s.bodyText}>{playbook.competitorGaps.summary}</Text>

        {sortedOpportunities.map((opp, i) => (
          <View key={i} wrap={false}>
            {i > 0 && <View style={s.divider} />}
            <View style={s.card}>
              <View style={s.headerRow}>
                <Text style={s.patternName}>{opp.patternName}</Text>
                <SeverityBadge text={opp.gapSeverity.toUpperCase()} variant={opp.gapSeverity} />
              </View>
              <Text style={s.bodyText}>{opp.description}</Text>
              <Text style={s.mutedText}>Used by: {opp.competitorsUsing.join(', ')}</Text>
              <View style={s.indigoBox}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#4F46E5', marginBottom: 4 }}>HOW TO ADAPT</Text>
                <Text style={s.indigoText}>{opp.adaptationSuggestion}</Text>
              </View>
              <ConfidencePill level={opp.confidence} reason={opp.confidenceReason} />
            </View>
          </View>
        ))}
      </View>
      )}

      {/* Section 2: Stop Doing */}
      {playbook.stopDoing && (
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>STOP DOING</Text>
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
                <Text style={s.mutedText}>Your data: {pattern.yourData}</Text>
                <Text style={s.mutedText}>Competitors: {pattern.competitorComparison}</Text>
              </View>
              <ConfidencePill level={pattern.confidence} reason={pattern.confidenceReason} />
            </View>
          </View>
        ))}
      </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
