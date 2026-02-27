import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel, FormatRecommendation, HookToTest } from '@/types/playbook';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import { PDFAdExampleRow } from './shared/PDFAdExampleRow';
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
  formatName: {
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
  hookType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  templateText: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 1.5,
  },
  numberedItem: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 3,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
});

const actionBadgeBase = {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  fontSize: 7,
  fontWeight: 'bold' as const,
};

const actionBadgeColors: Record<FormatRecommendation['action'], { bg: string; color: string; label: string }> = {
  scale: { bg: '#DCFCE7', color: '#166534', label: 'SCALE' },
  test: { bg: '#DBEAFE', color: '#1E40AF', label: 'TEST' },
  reduce: { bg: '#FEE2E2', color: '#991B1B', label: 'REDUCE' },
};

const priorityToSeverity: Record<HookToTest['priority'], 'critical' | 'moderate' | 'minor'> = {
  high: 'critical',
  medium: 'moderate',
  low: 'minor',
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

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface Props {
  playbook: PlaybookContent;
  brandName: string;
  branding: ReportBranding;
}

export function PlaybookStrategy({ playbook, brandName, branding }: Props) {
  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Creative Strategy" branding={branding} />

      {/* Section 1: Format Strategy */}
      {playbook.formatStrategy && (
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>FORMAT STRATEGY</Text>
        <Text style={s.bodyText}>{playbook.formatStrategy.summary}</Text>

        {playbook.formatStrategy.recommendations?.map((rec, i) => {
          const defaultBadge = { bg: '#F3F4F6', color: '#374151', label: rec.action?.toUpperCase() || 'N/A' };
          const badge = (rec.action && actionBadgeColors[rec.action as keyof typeof actionBadgeColors]) || defaultBadge;
          return (
            <View key={i} wrap={false}>
              {i > 0 && <View style={s.divider} />}
              <View style={s.card}>
                <View style={s.headerRow}>
                  <Text style={s.formatName}>{toTitleCase(rec.format)}</Text>
                  <Text style={[actionBadgeBase, { backgroundColor: badge.bg, color: badge.color }]}>
                    {badge.label}
                  </Text>
                </View>
                <Text style={s.bodyText}>{rec.rationale}</Text>
                <View style={s.twoColRow}>
                  <Text style={[s.mutedText, { flex: 1 }]}>Your data: {rec.yourData}</Text>
                  <Text style={[s.mutedText, { flex: 1 }]}>Competitor data: {rec.competitorData}</Text>
                </View>
                {rec.creativeSpec && (
                  <View style={s.indigoBox}>
                    <Text style={s.indigoText}>{rec.creativeSpec}</Text>
                  </View>
                )}
                <ConfidencePill level={rec.confidence} reason={rec.confidenceReason} />
                {rec.exampleAds && rec.exampleAds.length > 0 && (
                  <PDFAdExampleRow
                    ads={rec.exampleAds.map(a => ({
                      thumbnail: a.thumbnailUrl,
                      competitorName: a.competitorName,
                    }))}
                    label="REFERENCE ADS"
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
      )}

      {/* Section 2: Hook Strategy */}
      {playbook.hookStrategy && (
      <View style={sharedStyles.section}>
        <Text style={sharedStyles.sectionTitle}>HOOK STRATEGY</Text>
        <Text style={s.bodyText}>{playbook.hookStrategy.summary}</Text>

        {/* Keep doing */}
        {playbook.hookStrategy.yourWinningHooks && playbook.hookStrategy.yourWinningHooks.length > 0 && (
          <>
            <Text style={s.subsectionTitle}>Keep doing</Text>
            <View style={sharedStyles.successBox}>
              {playbook.hookStrategy.yourWinningHooks.map((hook, i) => (
                <View key={i} style={sharedStyles.listItem}>
                  <View style={[sharedStyles.bullet, { backgroundColor: colors.success }]} />
                  <Text style={sharedStyles.listText}>{hook}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Test these hooks */}
        {playbook.hookStrategy.toTest?.length > 0 && (
          <>
            <Text style={s.subsectionTitle}>Test these hooks</Text>
            {playbook.hookStrategy.toTest.map((hook, i) => (
              <View key={i} wrap={false}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.card}>
                  <View style={s.headerRow}>
                    <Text style={s.hookType}>{hook.hookType}</Text>
                    <SeverityBadge
                      text={hook.priority.toUpperCase()}
                      variant={priorityToSeverity[hook.priority]}
                    />
                  </View>
                  <View style={s.indigoBox}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#4F46E5', marginBottom: 4 }}>TEMPLATE</Text>
                    <Text style={s.templateText}>&ldquo;{hook.hookTemplate}&rdquo;</Text>
                  </View>
                  {hook.hookVariations && hook.hookVariations.length > 0 && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 8, fontWeight: 'bold', color: colors.muted, marginBottom: 4 }}>VARIATIONS</Text>
                      {hook.hookVariations.map((v, vi) => (
                        <Text key={vi} style={s.numberedItem}>{vi + 1}. {v}</Text>
                      ))}
                    </View>
                  )}
                  <Text style={s.bodyText}>{hook.whyItWorks}</Text>
                  <ConfidencePill level={hook.confidence} reason={hook.confidenceReason} />
                  {hook.exampleAds && hook.exampleAds.length > 0 && (
                    <PDFAdExampleRow
                      ads={hook.exampleAds.map(a => ({
                        thumbnail: a.thumbnailUrl,
                        competitorName: a.competitorName,
                      }))}
                      label="REFERENCE ADS"
                    />
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
