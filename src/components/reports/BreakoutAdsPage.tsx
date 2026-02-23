import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import sharedStyles, { colors } from './shared/ReportStyles';
import { formatDimensionLabel } from '@/lib/reports/creative-labels';

const s = StyleSheet.create({
  subtitle: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 16,
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
}

export function BreakoutAdsPage({ breakouts, branding }: Props) {
  const events = breakouts.events.slice(0, 3);
  const cashCows = breakouts.cashCows.slice(0, 3);
  const patterns = breakouts.winningPatterns.slice(0, 5);

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Breakout Ads" branding={branding} />
      <Text style={s.subtitle}>
        Ads that survived while most cohort siblings were killed
      </Text>

      {/* Breakout Events */}
      {events.map((event, i) => (
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
        </View>
      ))}

      {/* Cash Cows */}
      {cashCows.length > 0 && (
        <>
          <Text style={s.sectionLabel}>Cash Cows</Text>
          {cashCows.map((cow, i) => (
            <View key={i} style={s.cashCowBox} wrap={false}>
              <Text style={s.cashCowTitle}>
                {cow.competitorName} — {cow.daysActive} days active
              </Text>
              {cow.traits.length > 0 && (
                <Text style={s.cashCowText}>
                  Traits: {cow.traits.join(', ')}
                </Text>
              )}
            </View>
          ))}
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
