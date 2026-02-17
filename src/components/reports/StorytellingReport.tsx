import { Document } from '@react-pdf/renderer';
import { ComputedReport, ReportBranding } from '@/types/report';
import { DetectedTrend, HookLibraryAnalysis } from '@/types/analysis';
import { PlaybookContent } from '@/types/playbook';
import { ReportCover } from './ReportCover';
import { IndustryLandscape } from './IndustryLandscape';
import { SignalDeepDivePages } from './SignalDeepDivePages';
import { TrendDeepDivePage } from './TrendDeepDivePage';
import { PlaybookActionPlan } from './PlaybookActionPlan';
import { PlaybookStrategy } from './PlaybookStrategy';
import { PlaybookGaps } from './PlaybookGaps';

interface StorytellingReportProps {
  report: ComputedReport;
  brandName: string;
  industry: string;
  branding: ReportBranding;
  trends?: DetectedTrend[];
  hookAnalysis?: HookLibraryAnalysis | null;
  playbook?: PlaybookContent | null;
}

export function StorytellingReport({
  report,
  brandName,
  industry,
  branding,
  trends,
  playbook,
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
        <TrendDeepDivePage trends={trends} branding={branding} />
      )}
      {playbook && (
        <>
          <PlaybookActionPlan playbook={playbook} brandName={brandName} branding={branding} />
          <PlaybookStrategy playbook={playbook} brandName={brandName} branding={branding} />
          <PlaybookGaps playbook={playbook} brandName={brandName} branding={branding} />
        </>
      )}
    </Document>
  );
}
