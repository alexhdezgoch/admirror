import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Ad, VelocitySignal, AdGrade } from '@/types';
import { ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';
import { stripEmoji } from '@/lib/reports/creative-labels';

const ADS_PER_PAGE = 4;

const s = StyleSheet.create({
  subtitle: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 16,
  },
  card: {
    marginBottom: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: colors.accent,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankAndName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent,
  },
  competitorName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  hookLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.muted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  hookText: {
    fontSize: 9,
    color: colors.textLight,
    fontStyle: 'italic',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  hookType: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    minWidth: 45,
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
  },
  barFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
});

const gradeBadgeColors: Record<AdGrade, { bg: string; color: string }> = {
  'A+': { bg: '#DCFCE7', color: '#166534' },
  A: { bg: '#DCFCE7', color: '#166534' },
  B: { bg: '#DBEAFE', color: '#1E40AF' },
  C: { bg: '#FEF3C7', color: '#92400E' },
  D: { bg: '#FEE2E2', color: '#991B1B' },
};

const signalBadgeColors: Record<VelocitySignal, { bg: string; color: string; label: string }> = {
  cash_cow: { bg: '#DCFCE7', color: '#166534', label: 'Cash Cow' },
  rising_star: { bg: '#DBEAFE', color: '#1E40AF', label: 'Rising Star' },
  burn_test: { bg: '#FEF3C7', color: '#92400E', label: 'Burn Test' },
  standard: { bg: '#F3F4F6', color: '#374151', label: 'Standard' },
  zombie: { bg: '#FEE2E2', color: '#991B1B', label: 'Zombie' },
};

const formatBadgeColors: Record<string, { bg: string; color: string }> = {
  video: { bg: '#DBEAFE', color: '#1E40AF' },
  static: { bg: '#F3F4F6', color: '#374151' },
  carousel: { bg: '#EDE9FE', color: '#6D28D9' },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '...';
}

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface Props {
  allAds: Ad[];
  clientAds: Ad[];
  brandName: string;
  branding: ReportBranding;
}

export function TopPerformers({ allAds, clientAds, brandName, branding }: Props) {
  const clientAdIds = new Set(clientAds.map(a => a.id));

  // Select top ads with diversity: max 2 per competitor, then top 8 by score
  const seenIds = new Set<string>();
  const sortedCompetitorAds = [...allAds]
    .filter(ad => {
      if (ad.isClientAd || clientAdIds.has(ad.id) || seenIds.has(ad.id)) return false;
      if (ad.scoring?.velocity?.signal === 'zombie') return false;
      seenIds.add(ad.id);
      return true;
    })
    .sort((a, b) => (b.scoring?.final || 0) - (a.scoring?.final || 0));

  const countByCompetitor = new Map<string, number>();
  const diverseAds = sortedCompetitorAds.filter(ad => {
    const count = countByCompetitor.get(ad.competitorName) || 0;
    if (count >= 2) return false;
    countByCompetitor.set(ad.competitorName, count + 1);
    return true;
  });

  const topAds = diverseAds.slice(0, 8);

  if (topAds.length === 0) return null;

  const competitorCount = new Set(topAds.map(a => a.competitorName)).size;

  // Split into pages of ADS_PER_PAGE
  const pages: Ad[][] = [];
  for (let i = 0; i < topAds.length; i += ADS_PER_PAGE) {
    pages.push(topAds.slice(i, i + ADS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageAds, pageIdx) => (
        <Page key={pageIdx} size="A4" style={sharedStyles.page}>
          <ReportHeader
            title={pageIdx === 0 ? 'Top Competitor Ads to Study' : 'Top Competitor Ads (cont.)'}
            branding={branding}
          />
          {pageIdx === 0 && (
            <Text style={s.subtitle}>
              Top performing ads across {competitorCount} competitor{competitorCount !== 1 ? 's' : ''} — up to 2 per competitor to show range
            </Text>
          )}

          {pageAds.map((ad, i) => {
            const rank = pageIdx * ADS_PER_PAGE + i + 1;
            const grade = ad.scoring?.grade;
            const signal = ad.scoring?.velocity?.signal;
            const score = ad.scoring?.final || 0;
            const gradeColors = grade ? gradeBadgeColors[grade] : null;
            const signalColors = signal ? signalBadgeColors[signal] : null;
            const fmtColors = formatBadgeColors[ad.format] || formatBadgeColors.static;

            return (
              <View key={ad.id} wrap={false} style={s.card}>
                {/* Header: rank + competitor name */}
                <View style={s.headerRow}>
                  <View style={s.rankAndName}>
                    <Text style={s.rank}>#{rank}</Text>
                    <Text style={s.competitorName}>{ad.competitorName}</Text>
                  </View>
                  {gradeColors && (
                    <Text style={[s.badge, { backgroundColor: gradeColors.bg, color: gradeColors.color }]}>
                      {grade}
                    </Text>
                  )}
                </View>

                {/* Meta badges row: format, grade, days, signal */}
                <View style={s.metaRow}>
                  <Text style={[s.badge, { backgroundColor: fmtColors.bg, color: fmtColors.color }]}>
                    {toTitleCase(ad.format)}
                  </Text>
                  {ad.daysActive > 0 && (
                    <Text style={[s.badge, { backgroundColor: '#F3F4F6', color: '#374151' }]}>
                      {ad.daysActive}d active
                    </Text>
                  )}
                  {signalColors && (
                    <Text style={[s.badge, { backgroundColor: signalColors.bg, color: signalColors.color }]}>
                      {signalColors.label}
                    </Text>
                  )}
                </View>

                {/* Hook */}
                {ad.hookText && (
                  <>
                    <Text style={s.hookLabel}>HOOK</Text>
                    <Text style={s.hookText}>&ldquo;{truncate(stripEmoji(ad.hookText), 100)}&rdquo;</Text>
                  </>
                )}
                {ad.hookType && (
                  <Text style={s.hookType}>Type: {toTitleCase(ad.hookType.replace('_', ' '))}</Text>
                )}

                {/* Score bar */}
                <View style={s.scoreRow}>
                  <Text style={s.scoreText}>{score}/100</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${Math.max(score, 1)}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}

          <ReportFooter branding={branding} />
        </Page>
      ))}
    </>
  );
}
