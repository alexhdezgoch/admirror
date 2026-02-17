import { Ad, ClientBrand, Competitor } from '@/types';
import { DetectedTrend } from '@/types/analysis';
import { HookLibraryAnalysis } from '@/types/analysis';
import { DistributionItem } from '@/lib/analytics';

export interface ReportBranding {
  companyName: string;
  websiteUrl: string;
  accentColor?: string;
  contactEmail?: string;
  showCTA?: boolean;
}

export interface StorySignal {
  id: string;
  category: 'volume' | 'quality' | 'format' | 'velocity' | 'trend' | 'creative';
  headline: string;
  detail: string;
  severity: number;
  dataPoints: Record<string, unknown>;
  visualType: 'bar_chart' | 'comparison_table' | 'stat_callout' | 'ranking_list';
}

export interface ReportData {
  clientBrand: Pick<ClientBrand, 'id' | 'name' | 'industry'>;
  allAds: Ad[];
  clientAds: Ad[];
  competitors: Competitor[];
  trends: DetectedTrend[];
  hookAnalysis: HookLibraryAnalysis | null;
  playbook: Record<string, unknown> | null;
}

export interface ComputedReport {
  signals: StorySignal[];
  distributions: {
    format: DistributionItem[];
    velocity: DistributionItem[];
    signal: DistributionItem[];
    grade: DistributionItem[];
    hookType: DistributionItem[];
  };
  perCompetitorCounts: { name: string; count: number; logo: string }[];
  metadata: {
    totalAds: number;
    competitorCount: number;
    clientAdsCount: number;
    metaConnected: boolean;
    generatedAt: string;
    brandName: string;
    industry: string;
  };
}
