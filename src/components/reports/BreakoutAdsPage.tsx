import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { Ad } from '@/types';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import { PDFAdThumbnail } from './shared/PDFAdThumbnail';
import { PDFAdExampleRow } from './shared/PDFAdExampleRow';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel } from '@/lib/reports/creative-labels';
import { buildAdMap, findAdsByIds } from '@/lib/reports/ad-lookup';

const s = StyleSheet.create({
  introParagraph: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 12,
  },
  sampleSize: {
    fontSize: 7.5,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  card: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeft: 3,
    borderLeftColor: colors.accent,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  competitorName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  survivalStat: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.accent,
  },
  cohortDates: {
    fontSize: 8,
    color: colors.muted,
    marginBottom: 6,
  },
  traitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  trait: {
    backgroundColor: '#eef2ff',
    color: colors.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 7,
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 8,
    color: colors.textLight,
    lineHeight: 1.4,
  },
  cashCowBox: {
    backgroundColor: colors.accent,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    gap: 12,
  },
  cashCowContent: {
    flex: 1,
  },
  cashCowTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cashCowText: {
    color: '#c7d2fe',
    fontSize: 9,
    marginBottom: 4,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  patternLabel: {
    flex: 1,
    fontSize: 9,
    color: colors.textLight,
  },
  patternStat: {
    fontSize: 9,
    color: colors.text,
    fontWeight: 'bold',
    marginRight: 8,
    minWidth: 50,
    textAlign: 'right',
  },
});

interface Props {
  breakouts: NonNullable<CreativeIntelligenceData['breakouts']>;
  branding: ReportBranding;
  metadata?: CreativeIntelligenceData['metadata'];
  allAds?: Ad[];
}

export function BreakoutAdsPage({ breakouts, branding, metadata, allAds }: Props) {
  const events = breakouts.events.slice(0, 3);
  const cashCows = breakouts.cashCows.slice(0, 3);
  const patterns = breakouts.winningPatterns.slice(0, 5);
  const adMap = buildAdMap(allAds || []);

  // Compute avg survival multiplier for intro text
  const avgSurvival = events.length > 0
    ? events.reduce((sum, e) => sum + e.survivalRate, 0) / events.length
    : 0;
  const survivalMultiplier = avgSurvival > 0 ? (1 / avgSurvival) : 0;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Breakout Ads" branding={branding} />
      <Text style={s.introParagraph}>
        {survivalMultiplier > 0
          ? `These are the ads that outlasted their peers. On average, breakout ads survived ${survivalMultiplier.toFixed(1)}x longer than typical ads in their cohort. Understanding what makes them different reveals the creative patterns worth replicating.`
          : 'These are the ads that outlasted their peers. Understanding what makes them different reveals the creative patterns worth replicating.'}
      </Text>

      {metadata && metadata.totalTaggedAds > 0 && (
        <Text style={s.sampleSize}>
          Monitoring {metadata.totalTaggedAds} ads for breakout performance signals
        </Text>
      )}

      {/* Breakout Events */}
      {events.map((event, i) => {
        const survivorAds = event.survivorAdIds
          ? findAdsByIds(adMap, event.survivorAdIds).slice(0, 3)
          : [];

        return (
          <View key={i} style={s.card} wrap={false}>
            <View style={s.cardHeader}>
              <Text style={s.competitorName}>{event.competitorName}</Text>
              <Text style={s.survivalStat}>
                {event.survivorsCount} of {event.totalInCohort} survived ({Math.round(event.survivalRate * 100)}%)
              </Text>
            </View>
            <Text style={s.cohortDates}>
              Cohort: {event.cohortStart} — {event.cohortEnd}
            </Text>
            {event.topSurvivorTraits.length > 0 && (
              <View style={s.traitRow}>
                {event.topSurvivorTraits.map((trait, j) => (
                  <Text key={j} style={s.trait}>{trait}</Text>
                ))}
              </View>
            )}
            {event.analysisSummary && (
              <Text style={s.summaryText}>{event.analysisSummary}</Text>
            )}
            {survivorAds.length > 0 && (
              <PDFAdExampleRow
                label="SURVIVING ADS"
                ads={survivorAds.map(a => ({
                  thumbnail: a.thumbnail,
                  competitorName: a.competitorName,
                }))}
              />
            )}
          </View>
        );
      })}

      {/* Cash Cows */}
      {cashCows.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Scaling Ads</Text>
          {cashCows.map((cow, i) => {
            const cowAd = adMap.get(cow.adId);
            return (
              <View key={i} style={s.cashCowBox} wrap={false}>
                {cowAd && (
                  <PDFAdThumbnail
                    src={cowAd.thumbnail}
                    width={50}
                    height={50}
                  />
                )}
                <View style={s.cashCowContent}>
                  <Text style={s.cashCowTitle}>
                    {cow.competitorName} — {cow.daysActive} days active
                  </Text>
                  {cow.traits.length > 0 && (
                    <Text style={s.cashCowText}>
                      Traits: {cow.traits.join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}

      {/* Winning Patterns */}
      {patterns.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Winning Patterns</Text>
          {patterns.map((pattern, i) => (
            <View key={i} style={s.patternRow}>
              <Text style={s.patternLabel}>
                {formatDimensionLabel(pattern.dimension, pattern.value)}
              </Text>
              <Text style={s.patternStat}>
                +{Math.round(pattern.avgLift * 100)}% lift
              </Text>
              <SeverityBadge
                text={pattern.confidence >= 0.8 ? 'HIGH' : pattern.confidence >= 0.5 ? 'MED' : 'LOW'}
                variant={pattern.confidence >= 0.8 ? 'critical' : pattern.confidence >= 0.5 ? 'moderate' : 'minor'}
              />
            </View>
          ))}
        </>
      )}

      <ReportFooter branding={branding} />
    </Page>
  );
}
