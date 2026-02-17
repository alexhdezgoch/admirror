import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel } from '@/types/playbook';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { ComparisonTable } from './shared/ComparisonTable';
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
  topInsightBox: {
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    padding: 12,
    marginBottom: 12,
    borderRadius: 4,
  },
  topInsightText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    lineHeight: 1.5,
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
  numberedBodyText: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 2,
  },
});

const testTypeBadgeColors: Record<string, { bg: string; color: string }> = {
  hook: { bg: '#DBEAFE', color: '#1E40AF' },
  format: { bg: '#DCFCE7', color: '#166534' },
  angle: { bg: '#FEF3C7', color: '#B45309' },
  creative: { bg: '#EDE9FE', color: '#6D28D9' },
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

export function PlaybookActionPlan({ playbook, brandName, branding }: Props) {
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
            <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#c7d2fe', marginBottom: 4 }}>ACTION</Text>
            <Text style={s.actionText}>{playbook.actionPlan.thisWeek.action}</Text>
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
                return (
                  <View key={i} wrap={false} style={s.card}>
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
                );
              })}
            </>
          )}

          {/* This Month */}
          {playbook.actionPlan.thisMonth?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>This Month</Text>
              {playbook.actionPlan.thisMonth.map((item, i) => (
                <View key={i} wrap={false} style={s.card}>
                  <Text style={{ fontSize: 9, color: colors.textLight }}>
                    {i + 1}. {item.action}
                  </Text>
                  <Text style={s.goalText}>Goal: {item.strategicGoal}</Text>
                  <View style={{ marginTop: 4 }}>
                    <ConfidencePill level={item.confidence} />
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* Section 2: Executive Summary */}
      {playbook.executiveSummary && (
        <View style={sharedStyles.section}>
          <Text style={sharedStyles.sectionTitle}>EXECUTIVE SUMMARY</Text>

          {/* Top Insight */}
          <View style={s.topInsightBox}>
            <Text style={s.topInsightText}>{playbook.executiveSummary.topInsight}</Text>
          </View>

          {/* Quick Wins */}
          {playbook.executiveSummary.quickWins?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Quick Wins</Text>
              {playbook.executiveSummary.quickWins.map((item, i) => (
                <View key={i} style={sharedStyles.listItem}>
                  <View style={[sharedStyles.bullet, { backgroundColor: colors.accent }]} />
                  <Text style={sharedStyles.listText}>{item}</Text>
                </View>
              ))}
            </>
          )}

          {/* Biggest Gaps */}
          {playbook.executiveSummary.biggestGaps?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Biggest Gaps</Text>
              {playbook.executiveSummary.biggestGaps.map((item, i) => (
                <View key={i} style={sharedStyles.listItem}>
                  <View style={[sharedStyles.bullet, { backgroundColor: colors.danger }]} />
                  <Text style={sharedStyles.listText}>{item}</Text>
                </View>
              ))}
            </>
          )}

          {/* Your Strengths */}
          {playbook.executiveSummary.yourStrengths?.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Your Strengths</Text>
              {playbook.executiveSummary.yourStrengths.map((item, i) => (
                <View key={i} style={sharedStyles.listItem}>
                  <View style={[sharedStyles.bullet, { backgroundColor: colors.success }]} />
                  <Text style={sharedStyles.listText}>{item}</Text>
                </View>
              ))}
            </>
          )}

          {/* Benchmarks Table */}
          {playbook.executiveSummary.benchmarks && playbook.executiveSummary.benchmarks.length > 0 && (
            <>
              <Text style={s.subsectionTitle}>Benchmarks</Text>
              <ComparisonTable
                headers={['Metric', 'You', 'Competitors', 'Gap', 'Interpretation']}
                rows={playbook.executiveSummary.benchmarks.map((b) => ({
                  cells: [
                    b.metric,
                    b.yourValue.toString(),
                    b.competitorAvg.toString(),
                    b.multiplier + 'x',
                    b.interpretation,
                  ],
                }))}
              />
            </>
          )}
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
