import { Document } from '@react-pdf/renderer';
import { ComputedReport, ReportBranding } from '@/types/report';
import { DetectedTrend, HookLibraryAnalysis } from '@/types/analysis';
import { PlaybookContent } from '@/types/playbook';
import { ReportCover } from './ReportCover';
import { IndustryLandscape } from './IndustryLandscape';
import { SignalDeepDivePages } from './SignalDeepDivePages';
import { TrendDeepDivePage } from './TrendDeepDivePage';

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
    </Document>
  );
}
