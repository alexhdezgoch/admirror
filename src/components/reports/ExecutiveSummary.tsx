import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { PlaybookContent, ConfidenceLevel, Benchmark } from '@/types/playbook';
import { Ad } from '@/types';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { ComparisonTable } from './shared/ComparisonTable';
import sharedStyles, { colors } from './shared/ReportStyles';

export function computeBenchmarks(allAds: Ad[]): Benchmark[] {
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
  lead: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 1.5,
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
});

interface Props {
  playbook: PlaybookContent;
  brandName: string;
  branding: ReportBranding;
  allAds?: Ad[];
}

export function ExecutiveSummary({ playbook, brandName, branding, allAds }: Props) {
  if (!playbook.executiveSummary) return null;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Executive Summary" branding={branding} />

      <Text style={s.lead}>
        Your competitors found what works. Here&apos;s how to catch up in 30 days.
      </Text>

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

      <ReportFooter branding={branding} />
    </Page>
  );
}
