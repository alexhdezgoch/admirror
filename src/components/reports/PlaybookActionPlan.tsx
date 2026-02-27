import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel, Benchmark } from '@/types/playbook';
import { getConfidenceLabel, confidenceLabelColors } from '@/lib/confidence';
import { Ad } from '@/types';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { ComparisonTable } from './shared/ComparisonTable';
import { PDFAdThumbnail } from './shared/PDFAdThumbnail';
import { buildAdMap } from '@/lib/reports/ad-lookup';
import sharedStyles, { colors } from './shared/ReportStyles';

function computeBenchmarks(allAds: Ad[]): Benchmark[] {
  const clientAds = allAds.filter((a) => a.isClientAd);
  const compAds = allAds.filter((a) => !a.isClientAd);

  if (clientAds.length === 0 && compAds.length === 0) return [];

  const avg = (ads: Ad[], fn: (a: Ad) => number) =>
    ads.length === 0 ? 0 : ads.reduce((sum, a) => sum + fn(a), 0) / ads.length;
  const max = (ads: Ad[], fn: (a: Ad) => number) =>
    ads.length === 0 ? 0 : Math.max(...ads.map(fn));
  const pct = (ads: Ad[], format: string) =>
    ads.length === 0 ? 0 : (ads.filter((a) => a.format === format).length / ads.length) * 100;
  const ratio = (a: number, b: number) =>
    b === 0 ? (a === 0 ? 1 : 0) : Math.round((a / b) * 10) / 10;

  const clientTotal = clientAds.length;
  const compTotal = compAds.length;
  const clientAvgDays = Math.round(avg(clientAds, (a) => a.daysActive));
  const compAvgDays = Math.round(avg(compAds, (a) => a.daysActive));
  const clientTopScore = Math.round(max(clientAds, (a) => a.scoring.final));
  const compTopScore = Math.round(max(compAds, (a) => a.scoring.final));
  const clientCarousel = Math.round(pct(clientAds, 'carousel'));
  const compCarousel = Math.round(pct(compAds, 'carousel'));
  const clientVideo = Math.round(pct(clientAds, 'video'));
  const compVideo = Math.round(pct(compAds, 'video'));
  const clientAvgScore = Math.round(avg(clientAds, (a) => a.scoring.final));
  const compAvgScore = Math.round(avg(compAds, (a) => a.scoring.final));

  return [
    {
      metric: 'Total Active Ads',
      yourValue: clientTotal,
      competitorAvg: compTotal,
      multiplier: ratio(clientTotal, compTotal),
      interpretation: clientTotal > compTotal
        ? 'You have more active creatives — good volume'
        : 'Competitors are running more active ads',
    },
    {
      metric: 'Avg Days Active',
      yourValue: clientAvgDays,
      competitorAvg: compAvgDays,
      multiplier: ratio(clientAvgDays, compAvgDays),
      interpretation: clientAvgDays > compAvgDays
        ? 'Your ads have longer longevity'
        : 'Competitors keep ads running longer',
    },
    {
      metric: 'Top Ad Score',
      yourValue: clientTopScore,
      competitorAvg: compTopScore,
      multiplier: ratio(clientTopScore, compTopScore),
      interpretation: clientTopScore >= compTopScore
        ? 'Your best creative matches or beats the competition'
        : 'Competitors have higher-scoring top creatives',
    },
    {
      metric: 'Carousel %',
      yourValue: clientCarousel,
      competitorAvg: compCarousel,
      multiplier: ratio(clientCarousel, compCarousel),
      interpretation: clientCarousel > compCarousel
        ? 'You lean heavier into carousels than competitors'
        : 'Competitors use more carousels in their mix',
    },
    {
      metric: 'Video %',
      yourValue: clientVideo,
      competitorAvg: compVideo,
      multiplier: ratio(clientVideo, compVideo),
      interpretation: clientVideo > compVideo
        ? 'You invest more in video creative'
        : 'Competitors rely more on video',
    },
    {
      metric: 'Avg Quality Score',
      yourValue: clientAvgScore,
      competitorAvg: compAvgScore,
      multiplier: ratio(clientAvgScore, compAvgScore),
      interpretation: clientAvgScore >= compAvgScore
        ? 'Your average creative quality is on par or better'
        : 'Competitors have higher average creative quality',
    },
  ];
}

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
          {(() => {
            const benchmarks = allAds && allAds.length > 0
              ? computeBenchmarks(allAds)
              : playbook.executiveSummary.benchmarks || [];
            if (benchmarks.length === 0) return null;

            const isPct = (m: string) => m.includes('%');
            const fmtVal = (b: Benchmark, val: number) =>
              allAds && allAds.filter((a) => a.isClientAd).length === 0 && val === b.yourValue
                ? '—'
                : isPct(b.metric)
                  ? `${val}%`
                  : val.toString();

            return (
              <>
                <Text style={s.subsectionTitle}>Benchmarks</Text>
                <ComparisonTable
                  headers={['Metric', 'You', 'Competitors', 'Gap', 'Interpretation']}
                  rows={benchmarks.map((b) => ({
                    cells: [
                      b.metric,
                      fmtVal(b, b.yourValue),
                      isPct(b.metric) ? `${b.competitorAvg}%` : b.competitorAvg.toString(),
                      `${b.multiplier}x`,
                      b.interpretation,
                    ],
                  }))}
                />
              </>
            );
          })()}
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
