import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ComputedReport, CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { Ad } from '@/types';
import { DetectedTrend, HookLibraryAnalysis, TrendAnalysisSummary } from '@/types/analysis';
import { PlaybookContent } from '@/types/playbook';
import { sanitizeForPDF, scanForMojibake } from '@/lib/reports/sanitize-emoji';
import { ReportCover } from './ReportCover';
import { ExecutiveSummary } from './ExecutiveSummary';
import { PlaybookActionPlan } from './PlaybookActionPlan';
import { PriorityGaps } from './PriorityGaps';
import { TopPerformers } from './TopPerformers';
import { CreativeGapPage } from './CreativeGapPage';
import { CreativeLandscapePage } from './CreativeLandscapePage';
import { BreakoutAdsPage } from './BreakoutAdsPage';
import { StopDoing } from './StopDoing';
import { ReportCTA } from './ReportCTA';
import { ReportHeader } from './shared/ReportHeader';
import { ReportFooter } from './shared/ReportFooter';
import sharedStyles, { colors } from './shared/ReportStyles';

const emptyStyles = StyleSheet.create({
  box: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 8, marginTop: 20 },
  title: { fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  text: { fontSize: 9, color: colors.textLight, lineHeight: 1.5 },
});

function EmptyPage({ title, text, branding }: { title: string; text: string; branding: ReportBranding }) {
  return (
    <Page size="A4" style={sharedStyles.page}>
      <ReportHeader title={title} branding={branding} />
      <View style={emptyStyles.box}>
        <Text style={emptyStyles.title}>{title}</Text>
        <Text style={emptyStyles.text}>{text}</Text>
      </View>
      <ReportFooter branding={branding} />
    </Page>
  );
}

interface StorytellingReportProps {
  report: ComputedReport;
  brandName: string;
  industry: string;
  branding: ReportBranding;
  trends?: DetectedTrend[];
  hookAnalysis?: HookLibraryAnalysis | null;
  playbook?: PlaybookContent | null;
  allAds?: Ad[];
  clientAds?: Ad[];
  creativeIntelligence?: CreativeIntelligenceData | null;
  trendSummary?: TrendAnalysisSummary | null;
}

export function StorytellingReport({
  report,
  brandName,
  industry,
  branding,
  trends,
  playbook,
  allAds,
  clientAds,
  creativeIntelligence,
  trendSummary,
}: StorytellingReportProps) {
  // Sanitize text data: strip emojis that Helvetica can't render (prevents mojibake)
  const safeTrends = trends ? sanitizeForPDF(trends) : trends;
  const safePlaybook = playbook ? sanitizeForPDF(playbook) : playbook;
  const safeAllAds = allAds ? sanitizeForPDF(allAds) : allAds;
  const safeClientAds = clientAds ? sanitizeForPDF(clientAds) : clientAds;
  const safeCreativeIntelligence = creativeIntelligence ? sanitizeForPDF(creativeIntelligence) : creativeIntelligence;

  // Post-sanitization mojibake check — flag if encoding corruption slipped through
  if (safePlaybook) {
    const scan = scanForMojibake(safePlaybook);
    if (!scan.clean) {
      console.warn('[Report] Mojibake detected in playbook after sanitization:', scan.issues);
    }
  }
  if (safeTrends) {
    const scan = scanForMojibake(safeTrends);
    if (!scan.clean) {
      console.warn('[Report] Mojibake detected in trends after sanitization:', scan.issues);
    }
  }
  if (safeAllAds) {
    const scan = scanForMojibake(safeAllAds);
    if (!scan.clean) {
      console.warn('[Report] Mojibake detected in ads after sanitization:', scan.issues);
    }
  }
  if (safeCreativeIntelligence) {
    const scan = scanForMojibake(safeCreativeIntelligence);
    if (!scan.clean) {
      console.warn('[Report] Mojibake detected in creative intelligence after sanitization:', scan.issues);
    }
  }

  return (
    <Document>
      {/* 1. Cover */}
      <ReportCover
        report={report}
        brandName={brandName}
        industry={industry}
        branding={branding}
        topInsight={safePlaybook?.executiveSummary?.topInsight}
      />

      {/* 2. Executive Summary */}
      {safePlaybook ? (
        <ExecutiveSummary
          playbook={safePlaybook}
          brandName={brandName}
          branding={branding}
          allAds={safeAllAds}
        />
      ) : (
        <EmptyPage
          title="Executive Summary"
          text="Add 3+ competitors to unlock your executive summary. The more competitor data we analyze, the sharper your strategic insights become."
          branding={branding}
        />
      )}

      {/* 3. 30-Day Action Plan (includes format + hook strategy) */}
      {safePlaybook ? (
        <PlaybookActionPlan
          playbook={safePlaybook}
          brandName={brandName}
          branding={branding}
          allAds={safeAllAds}
        />
      ) : (
        <EmptyPage
          title="30-Day Creative Playbook"
          text="Add 3+ competitors to unlock your 30-day playbook. This section provides a prioritized action plan, format strategy, and hook recommendations tailored to your competitive landscape."
          branding={branding}
        />
      )}

      {/* 4. Priority Gaps */}
      <PriorityGaps
        signals={report.signals}
        branding={branding}
        trends={safeTrends}
        opportunities={safePlaybook?.competitorGaps?.opportunities}
      />

      {/* 5. Top Competitor Ads */}
      {safeAllAds && safeAllAds.length > 0 ? (
        <TopPerformers
          allAds={safeAllAds}
          clientAds={safeClientAds || []}
          brandName={brandName}
          branding={branding}
        />
      ) : (
        <EmptyPage
          title="Top Performers"
          text="No scored ads available yet. Once your competitors' ads are synced and scored, the highest-performing creatives will appear here."
          branding={branding}
        />
      )}

      {/* 6. Creative Gap Analysis */}
      {safeCreativeIntelligence?.gaps ? (
        <CreativeGapPage
          gaps={safeCreativeIntelligence.gaps}
          brandName={brandName}
          branding={branding}
          metadata={safeCreativeIntelligence.metadata}
          allAds={safeAllAds}
        />
      ) : (
        <EmptyPage
          title="Creative Gap Analysis"
          text="Connect your Meta ad account to compare your creative patterns against competitors. Gap analysis identifies untapped opportunities where competitors are winning but you're not yet competing."
          branding={branding}
        />
      )}

      {/* 7. What's Working (includes market momentum + convergence alerts) */}
      {safeCreativeIntelligence && safeCreativeIntelligence.velocity ? (
        <CreativeLandscapePage
          velocity={safeCreativeIntelligence.velocity}
          branding={branding}
          rawPrevalence={safeCreativeIntelligence.rawPrevalence}
          clientPatterns={safeCreativeIntelligence.clientPatterns}
          metadata={safeCreativeIntelligence.metadata}
          competitorCount={report.metadata.competitorCount}
          convergence={safeCreativeIntelligence.convergence}
        />
      ) : (
        <EmptyPage
          title="Creative Landscape"
          text="Creative pattern data is not yet available. Once your competitors' ads are tagged and analyzed, you'll see what formats, styles, and approaches dominate your industry."
          branding={branding}
        />
      )}

      {/* 8. Breakout Ads */}
      {safeCreativeIntelligence?.breakouts && safeCreativeIntelligence.breakouts.events.length > 0 ? (
        <BreakoutAdsPage
          breakouts={safeCreativeIntelligence.breakouts}
          branding={branding}
          metadata={safeCreativeIntelligence.metadata}
          allAds={safeAllAds}
        />
      ) : (
        <EmptyPage
          title="Breakout Analysis"
          text="Not enough long-running ads to identify breakouts yet. As more competitor ads age past 60 days, we'll surface the rare creatives that keep scaling while others fatigue."
          branding={branding}
        />
      )}

      {/* 9. Stop Doing */}
      {safePlaybook ? (
        <StopDoing
          playbook={safePlaybook}
          brandName={brandName}
          branding={branding}
        />
      ) : (
        <EmptyPage
          title="What to Stop Doing"
          text="Add 3+ competitors to unlock anti-pattern detection. We'll identify creative approaches that are failing across your industry so you can avoid wasting budget on them."
          branding={branding}
        />
      )}

      {/* 10. Next Steps */}
      {branding.showCTA !== false && (
        <ReportCTA brandName={brandName} branding={branding} />
      )}
    </Document>
  );
}
