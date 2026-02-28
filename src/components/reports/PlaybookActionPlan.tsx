import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel, FormatRecommendation, HookToTest } from '@/types/playbook';
import { getConfidenceLabel, confidenceLabelColors } from '@/lib/confidence';
import { Ad } from '@/types';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import { PDFAdThumbnail } from './shared/PDFAdThumbnail';
import { PDFAdExampleRow } from './shared/PDFAdExampleRow';
import { buildAdMap } from '@/lib/reports/ad-lookup';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  pill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
    backgroundColor: '#f1f5f9',
    color: colors.muted,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  card: {
    marginBottom: 12,
  },
  numberedAction: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  mutedText: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  subsectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    marginTop: 12,
  },
  actionText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  rationaleText: {
    fontSize: 9,
    color: '#c7d2fe',
    marginTop: 4,
  },
  goalText: {
    fontSize: 8,
    color: colors.muted,
    marginTop: 2,
  },
  // Format + Hook strategy styles (absorbed from PlaybookStrategy)
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
});

const testTypeBadgeColors: Record<string, { bg: string; color: string }> = {
  hook: { bg: '#DBEAFE', color: '#1E40AF' },
  format: { bg: '#DCFCE7', color: '#166534' },
  angle: { bg: '#FEF3C7', color: '#B45309' },
  creative: { bg: '#EDE9FE', color: '#6D28D9' },
};

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

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
  allAds?: Ad[];
}

export function PlaybookActionPlan({ playbook, brandName, branding, allAds }: Props) {
  const adMap = buildAdMap(allAds || []);
  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="30-Day Action Plan" branding={branding} />

      {/* Section 1: Action Plan */}
      {playbook.actionPlan && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>ACTION PLAN</Text>

          {/* This Week */}
          <Text style={s.subsectionTitle}>This Week</Text>
          <View style={sharedStyles.gutPunchBox}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {(() => {
                const refAd = playbook.actionPlan.thisWeek.referenceAdId
                  ? adMap.get(playbook.actionPlan.thisWeek.referenceAdId)
                  : undefined;
                if (!refAd) return null;
                const confLabel = getConfidenceLabel(refAd.daysActive);
                const confColors = confidenceLabelColors[confLabel];
                return (
                  <View style={{ alignItems: 'center', gap: 4 }}>
                    <PDFAdThumbnail src={refAd.thumbnail} width={55} height={55} label={refAd.competitorName} />
                    <Text style={[s.pill, { backgroundColor: confColors.bg, color: confColors.color }]}>
                      {confLabel}
                    </Text>
                  </View>
                );
              })()}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#c7d2fe', marginBottom: 4 }}>ACTION</Text>
                <Text style={s.actionText}>{playbook.actionPlan.thisWeek.action}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#c7d2fe', marginTop: 8, marginBottom: 2 }}>WHY</Text>
            <Text style={s.rationaleText}>{playbook.actionPlan.thisWeek.rationale}</Text>
            <View style={s.pillRow}>
              {playbook.actionPlan.thisWeek.budget && (
                <Text style={[s.pill, { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }]}>
                  BUDGET: {playbook.actionPlan.thisWeek.budget}
                </Text>
              )}
              {playbook.actionPlan.thisWeek.killCriteria && (
                <Text style={[s.pill, { backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }]}>
                  KILL CRITERIA: {playbook.actionPlan.thisWeek.killCriteria}
                </Text>
              )}
            </View>
            <View style={{ marginTop: 8 }}>
              <ConfidencePill
                level={playbook.actionPlan.thisWeek.confidence}
                reason={playbook.actionPlan.thisWeek.confidenceReason}
              />
            </View>
          </View>

          {/* Next 2 Weeks */}
          {playbook.actionPlan.nextTwoWeeks?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Next 2 Weeks</Text>
              {playbook.actionPlan.nextTwoWeeks.map((item, i) => {
                const badgeColor = testTypeBadgeColors[item.testType] || testTypeBadgeColors.creative;
                const refAd = item.referenceAdId ? adMap.get(item.referenceAdId) : undefined;
                return (
                  <View key={i} wrap={false} style={s.card}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {refAd && (
                        <PDFAdThumbnail src={refAd.thumbnail} width={45} height={45} label={refAd.competitorName} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={s.numberedAction}>{i + 1}. {item.action}</Text>
                        <View style={s.badgeRow}>
                          <Text style={[s.pill, { backgroundColor: badgeColor.bg, color: badgeColor.color }]}>
                            {item.testType.toUpperCase()}
                          </Text>
                          {item.budget && (
                            <Text style={s.pill}>BUDGET: {item.budget}</Text>
                          )}
                          <ConfidencePill level={item.confidence} />
                        </View>
                        {item.killCriteria && (
                          <Text style={s.mutedText}>Kill criteria: {item.killCriteria}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* This Month */}
          {playbook.actionPlan.thisMonth?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>This Month</Text>
              {playbook.actionPlan.thisMonth.map((item, i) => {
                const refAd = item.referenceAdId ? adMap.get(item.referenceAdId) : undefined;
                return (
                  <View key={i} wrap={false} style={s.card}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {refAd && (
                        <PDFAdThumbnail src={refAd.thumbnail} width={40} height={40} label={refAd.competitorName} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: colors.textLight }}>
                          {i + 1}. {item.action}
                        </Text>
                        <Text style={s.goalText}>Goal: {item.strategicGoal}</Text>
                        <View style={{ marginTop: 4 }}>
                          <ConfidencePill level={item.confidence} />
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* Monitor & Test Later */}
          {playbook.actionPlan.monitorAndTestLater && playbook.actionPlan.monitorAndTestLater.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Monitor & Test Later</Text>
              {playbook.actionPlan.monitorAndTestLater.map((item, i) => {
                const refAd = item.referenceAdId ? adMap.get(item.referenceAdId) : undefined;
                return (
                  <View key={i} wrap={false} style={[s.card, { borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 8 }]}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {refAd && (
                        <PDFAdThumbnail src={refAd.thumbnail} width={40} height={40} label={refAd.competitorName} />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: colors.textLight }}>{item.action}</Text>
                        <Text style={s.mutedText}>{item.rationale}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </View>
      )}

      {/* Section 2: Format Strategy (absorbed from PlaybookStrategy) */}
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

      {/* Section 3: Hook Strategy (absorbed from PlaybookStrategy) */}
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
