import { Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { StorySignal, CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { DetectedTrend } from '@/types/analysis';
import { CompetitorOpportunity, ConfidenceLevel } from '@/types/playbook';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import { SeverityBadge } from './shared/SeverityBadge';
import { PDFAdExampleRow } from './shared/PDFAdExampleRow';
import sharedStyles, { colors } from './shared/ReportStyles';

export interface NormalizedGap {
  patternName: string;
  severity: 'critical' | 'high' | 'moderate' | 'minor';
  description: string;
  evidence: string;
  recommendation: string;
  exampleAds?: Array<{ thumbnail?: string; competitorName?: string }>;
  confidence?: ConfidenceLevel;
}

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, ' ').trim();
}

const severityRank: Record<string, number> = {
  critical: 0,
  high: 1,
  moderate: 2,
  minor: 3,
};

export function deduplicateGaps(
  signals: StorySignal[],
  trends?: DetectedTrend[],
  opportunities?: CompetitorOpportunity[],
): NormalizedGap[] {
  const gapMap = new Map<string, NormalizedGap>();

  // 1. Signals (lowest priority — overwritten by trends/opportunities)
  for (const sig of signals) {
    if (sig.category !== 'creative' && sig.category !== 'trend') continue;
    const key = normalizeKey(sig.headline);
    gapMap.set(key, {
      patternName: sig.headline,
      severity: sig.severity >= 8 ? 'critical' : sig.severity >= 5 ? 'high' : 'moderate',
      description: sig.detail,
      evidence: `Severity ${sig.severity}/10`,
      recommendation: sig.detail,
    });
  }

  // 2. Trends with gaps (medium priority)
  if (trends) {
    for (const trend of trends) {
      if (!trend.hasGap) continue;
      const key = normalizeKey(trend.trendName);
      const gapSeverity = trend.gapDetails?.severity;
      const severity: NormalizedGap['severity'] =
        gapSeverity === 'critical' ? 'critical' :
        gapSeverity === 'high' ? 'high' :
        gapSeverity === 'moderate' ? 'moderate' : 'minor';
      gapMap.set(key, {
        patternName: trend.trendName,
        severity,
        description: trend.description,
        evidence: `${trend.evidence.adCount} ads from ${trend.evidence.competitorCount} competitors`,
        recommendation: trend.adaptationRecommendation || trend.recommendedAction,
        confidence: 'medium',
      });
    }
  }

  // 3. Opportunities (highest priority — richest data)
  if (opportunities) {
    for (const opp of opportunities) {
      const key = normalizeKey(opp.patternName);
      gapMap.set(key, {
        patternName: opp.patternName,
        severity: opp.gapSeverity === 'critical' ? 'critical' : opp.gapSeverity === 'moderate' ? 'moderate' : 'minor',
        description: opp.description,
        evidence: `Used by: ${opp.competitorsUsing.join(', ')}`,
        recommendation: opp.adaptationSuggestion,
        exampleAds: opp.exampleAds?.map(a => ({
          thumbnail: a.thumbnailUrl,
          competitorName: a.competitorName,
        })),
        confidence: opp.confidence,
      });
    }
  }

  return Array.from(gapMap.values())
    .sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3))
    .slice(0, 5);
}

const s = StyleSheet.create({
  lead: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
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
  evidenceText: {
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
});

function ConfidencePill({ level }: { level: ConfidenceLevel }) {
  const style =
    level === 'high' ? sharedStyles.confidenceHigh :
    level === 'medium' ? sharedStyles.confidenceMedium :
    sharedStyles.confidenceHypothesis;

  return <Text style={style}>{level.toUpperCase()}</Text>;
}

interface Props {
  signals: StorySignal[];
  branding: ReportBranding;
  trends?: DetectedTrend[];
  opportunities?: CompetitorOpportunity[];
}

export function PriorityGaps({ signals, branding, trends, opportunities }: Props) {
  const gaps = deduplicateGaps(signals, trends, opportunities);

  if (gaps.length === 0) return null;

  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title="Priority Gaps" branding={branding} />

      <Text style={s.lead}>
        These patterns are winning for competitors. You&apos;re not using them.
      </Text>

      {gaps.map((gap, i) => (
        <View key={i} wrap={false}>
          {i > 0 && <View style={s.divider} />}
          <View style={s.card}>
            <View style={s.headerRow}>
              <Text style={s.patternName}>{gap.patternName}</Text>
              <SeverityBadge text={gap.severity.toUpperCase()} variant={gap.severity} />
            </View>
            <Text style={s.bodyText}>{gap.description}</Text>
            <Text style={s.evidenceText}>{gap.evidence}</Text>
            <View style={s.indigoBox}>
              <Text style={{ fontSize: 8, fontWeight: 'bold', color: '#4F46E5', marginBottom: 4 }}>HOW TO ADAPT</Text>
              <Text style={s.indigoText}>{gap.recommendation}</Text>
            </View>
            {gap.exampleAds && gap.exampleAds.length > 0 && (
              <PDFAdExampleRow ads={gap.exampleAds} label="COMPETITOR EXAMPLES" />
            )}
            {gap.confidence && <ConfidencePill level={gap.confidence} />}
          </View>
        </View>
      ))}

      <ReportFooter branding={branding} />
    </Page>
  );
}
