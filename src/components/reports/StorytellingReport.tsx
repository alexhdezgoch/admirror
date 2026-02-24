import { Document } from '@react-pdf/renderer';
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
      {trends && trends.length > 0 && (
        <TrendDeepDivePage trends={trends} branding={branding} allAds={allAds} />
      )}
      {creativeIntelligence && creativeIntelligence.velocity && (
        <CreativeLandscapePage
          velocity={creativeIntelligence.velocity}
          branding={branding}
          rawPrevalence={creativeIntelligence.rawPrevalence}
          clientPatterns={creativeIntelligence.clientPatterns}
          metadata={creativeIntelligence.metadata}
          competitorCount={report.metadata.competitorCount}
        />
      )}
      {creativeIntelligence && creativeIntelligence.velocity && (
        <CreativeTrendsPage
          velocity={creativeIntelligence.velocity}
          convergence={creativeIntelligence.convergence}
          branding={branding}
          clientPatterns={creativeIntelligence.clientPatterns}
          rawPrevalence={creativeIntelligence.rawPrevalence}
          metadata={creativeIntelligence.metadata}
        />
      )}
      {creativeIntelligence?.gaps && (
        <CreativeGapPage
          gaps={creativeIntelligence.gaps}
          brandName={brandName}
          branding={branding}
          metadata={creativeIntelligence.metadata}
          allAds={allAds}
        />
      )}
      {creativeIntelligence?.breakouts && creativeIntelligence.breakouts.events.length > 0 && (
        <BreakoutAdsPage
          breakouts={creativeIntelligence.breakouts}
          branding={branding}
          metadata={creativeIntelligence.metadata}
          allAds={allAds}
        />
      )}
      {playbook && (
        <>
          <PlaybookActionPlan playbook={playbook} brandName={brandName} branding={branding} allAds={allAds} />
          <PlaybookStrategy playbook={playbook} brandName={brandName} branding={branding} />
          <PlaybookGaps playbook={playbook} brandName={brandName} branding={branding} />
        </>
      )}
      {allAds && allAds.length > 0 && (
        <TopPerformers
          allAds={allAds}
          clientAds={clientAds || []}
          brandName={brandName}
          branding={branding}
        />
      )}
      {branding.showCTA !== false && (
        <ReportCTA brandName={brandName} branding={branding} />
      )}
    </Document>
  );
}
