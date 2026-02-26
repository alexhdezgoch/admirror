import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { ComputedReport, CreativeIntelligenceData, ReportBranding } from '@/types/report';
import { Ad } from '@/types';
import { DetectedTrend, HookLibraryAnalysis } from '@/types/analysis';
import { PlaybookContent } from '@/types/playbook';
import { ReportCover } from './ReportCover';
import { IndustryLandscape } from './IndustryLandscape';
import { SignalDeepDivePages } from './SignalDeepDivePages';
import { TrendDeepDivePage } from './TrendDeepDivePage';
import { CreativeLandscapePage } from './CreativeLandscapePage';
import { CreativeTrendsPage } from './CreativeTrendsPage';
import { CreativeGapPage } from './CreativeGapPage';
import { BreakoutAdsPage } from './BreakoutAdsPage';
import { PlaybookActionPlan } from './PlaybookActionPlan';
import { PlaybookStrategy } from './PlaybookStrategy';
import { PlaybookGaps } from './PlaybookGaps';
import { TopPerformers } from './TopPerformers';
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
}: StorytellingReportProps) {
  return (
    <Document>
      <ReportCover
        report={report}
        brandName={brandName}
        industry={industry}
        branding={branding}
      />
      <IndustryLandscape
        report={report}
        brandName={brandName}
        branding={branding}
      />
      <SignalDeepDivePages
        signals={report.signals}
        brandName={brandName}
        branding={branding}
      />
      {trends && trends.length > 0 ? (
        <TrendDeepDivePage trends={trends} branding={branding} allAds={allAds} />
      ) : (
        <EmptyPage
          title="Trend Analysis Coming Soon"
          text="Industry trend detection requires at least 3 competitor ads with sufficient data. As more ads are tracked and analyzed, trending creative patterns will appear here."
          branding={branding}
        />
      )}
      {creativeIntelligence && creativeIntelligence.velocity ? (
        <CreativeLandscapePage
          velocity={creativeIntelligence.velocity}
          branding={branding}
          rawPrevalence={creativeIntelligence.rawPrevalence}
          clientPatterns={creativeIntelligence.clientPatterns}
          metadata={creativeIntelligence.metadata}
          competitorCount={report.metadata.competitorCount}
        />
      ) : (
        <EmptyPage
          title="Creative Landscape Coming Soon"
          text="Creative pattern analysis requires tagged ad data from at least one weekly snapshot. Once your competitors' ads are tagged and analyzed, you'll see what creative formats, styles, and approaches dominate your industry."
          branding={branding}
        />
      )}
      {creativeIntelligence && creativeIntelligence.velocity ? (
        <CreativeTrendsPage
          velocity={creativeIntelligence.velocity}
          convergence={creativeIntelligence.convergence}
          branding={branding}
          clientPatterns={creativeIntelligence.clientPatterns}
          rawPrevalence={creativeIntelligence.rawPrevalence}
          metadata={creativeIntelligence.metadata}
        />
      ) : (
        <EmptyPage
          title="Creative Trends Coming Soon"
          text="Trend velocity tracking requires at least two weekly snapshots to detect directional changes. After the next snapshot cycle, you'll see which creative patterns are accelerating or decelerating in your market."
          branding={branding}
        />
      )}
      {creativeIntelligence?.gaps ? (
        <CreativeGapPage
          gaps={creativeIntelligence.gaps}
          brandName={brandName}
          branding={branding}
          metadata={creativeIntelligence.metadata}
          allAds={allAds}
        />
      ) : (
        <EmptyPage
          title="Gap Analysis Coming Soon"
          text="Creative gap analysis compares your ad patterns against competitors to find untapped opportunities. This requires tagged ad data for both your brand and competitors. Connect your Meta account for personalized gap insights."
          branding={branding}
        />
      )}
      {creativeIntelligence?.breakouts && creativeIntelligence.breakouts.events.length > 0 ? (
        <BreakoutAdsPage
          breakouts={creativeIntelligence.breakouts}
          branding={branding}
          metadata={creativeIntelligence.metadata}
          allAds={allAds}
        />
      ) : (
        <EmptyPage
          title="Breakout Analysis Coming Soon"
          text="Breakout analysis identifies ads that dramatically outlast their peers — the rare creatives that keep scaling while others fatigue. This requires lifecycle data from multiple snapshot cycles."
          branding={branding}
        />
      )}
      {playbook ? (
        <>
          <PlaybookActionPlan playbook={playbook} brandName={brandName} branding={branding} allAds={allAds} />
          <PlaybookStrategy playbook={playbook} brandName={brandName} branding={branding} />
          <PlaybookGaps playbook={playbook} brandName={brandName} branding={branding} />
        </>
      ) : (
        <EmptyPage
          title="Creative Playbook Coming Soon"
          text="Your creative playbook will be generated once sufficient competitive data is collected. The playbook provides a 30-day action plan, format strategy, and hook recommendations tailored to your industry."
          branding={branding}
        />
      )}
      {allAds && allAds.length > 0 ? (
        <TopPerformers
          allAds={allAds}
          clientAds={clientAds || []}
          brandName={brandName}
          branding={branding}
        />
      ) : (
        <EmptyPage
          title="Top Performers Coming Soon"
          text="Top performer analysis requires ad data from your competitors. Once ads are synced and scored, the highest-performing competitor creatives will appear here for study."
          branding={branding}
        />
      )}
      {branding.showCTA !== false && (
        <ReportCTA brandName={brandName} branding={branding} />
      )}
    </Document>
  );
}
