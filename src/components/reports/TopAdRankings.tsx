import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Ad } from '@/types';
import { ReportBranding } from '@/types/report';
import { sortByConfidenceScore } from '@/lib/confidence';
import { TOP_ADS_THRESHOLD } from '@/lib/story-signals';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { ComparisonTable } from './shared/ComparisonTable';
import { StatCallout } from './shared/StatCallout';
import sharedStyles, { colors } from './shared/ReportStyles';

const s = StyleSheet.create({
  insight: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: 1,
    borderBottomColor: colors.border,
  },
  recommendation: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    marginTop: 12,
  },
  recommendationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 9,
    color: colors.textLight,
    lineHeight: 1.5,
  },
});

interface Props {
  allAds: Ad[];
  clientAds: Ad[];
  brandName: string;
  branding: ReportBranding;
}

export function TopAdRankings({ allAds, clientAds, brandName, branding }: Props) {
  const N = TOP_ADS_THRESHOLD;

  // Defensive merge: ensure clientAds are included (same pattern as story-signals.ts)
  const merged = [...allAds, ...clientAds.filter(ca => !allAds.some(a => a.id === ca.id))];

  const sorted = [...merged].sort(sortByConfidenceScore);
  const topN = sorted.slice(0, N);

  // Group by competitor (client ads use brandName)
  const countMap = new Map<string, number>();
  topN.forEach(ad => {
    const name = ad.isClientAd ? brandName : ad.competitorName;
    countMap.set(name, (countMap.get(name) || 0) + 1);
  });

  // Ensure ALL competitors appear (even those with 0 ads in top N)
  merged.forEach(ad => {
    const name = ad.isClientAd ? brandName : ad.competitorName;
    if (!countMap.has(name)) {
      countMap.set(name, 0);
    }
  });

  // Ensure client always appears
  if (!countMap.has(brandName)) {
    countMap.set(brandName, 0);
  }

  const numCompetitors = new Set(
    merged.filter(a => !a.isClientAd).map(a => a.competitorName)
  ).size;

  const expectedShare = numCompetitors > 0 ? N / (numCompetitors + 1) : N / 2;
  const clientCount = countMap.get(brandName) || 0;
  const clientSharePct = Math.round((clientCount / N) * 100);
  const expectedSharePct = Math.round((expectedShare / N) * 100);
  const isUnderperforming = clientCount < expectedShare;

  // Build rows sorted by count descending
  const rows = Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      cells: [
        name === brandName ? `${brandName} (You)` : name,
        `${count}`,
        `${Math.round((count / N) * 100)}%`,
      ],
      highlight: name === brandName,
    }));

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Top 20 Ad Rankings" branding={branding} />

      <Text style={s.sectionTitle}>Top 20 Ad Rankings</Text>

      <Text style={s.insight}>
        When all {merged.length} ads are ranked by composite score, {brandName} captures {clientSharePct}% of the top {N} slots. With {numCompetitors} competitors, an equal share would be ~{expectedSharePct}%.
      </Text>

      <ComparisonTable
        headers={['Competitor', 'Ads in Top 20', 'Share']}
        rows={rows}
        columnWidths={[50, 25, 25]}
      />

      <StatCallout
        stat={`${clientCount} of ${N}`}
        context={`Expected share: ~${Math.round(expectedShare)} ads (${expectedSharePct}%)`}
        variant={isUnderperforming ? 'danger' : 'neutral'}
      />

      {isUnderperforming && (
        <View style={s.recommendation}>
          <Text style={s.recommendationTitle}>Recommendation</Text>
          <Text style={s.recommendationText}>
            {brandName} is underrepresented in the top {N} ads. Consider investing in stronger hooks, higher production value, and clearer offer framing to improve your share of the highest-performing ad slots in your industry.
          </Text>
        </View>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
