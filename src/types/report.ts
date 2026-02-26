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

export interface CreativeIntelligenceData {
  velocity: {
    topAccelerating: Array<{
      dimension: string;
      value: string;
      velocityPercent: number;
      currentPrevalence: number;
      adCount: number;
    }>;
    topDeclining: Array<{
      dimension: string;
      value: string;
      velocityPercent: number;
      currentPrevalence: number;
      adCount: number;
    }>;
    trackDivergences: Array<{
      dimension: string;
      value: string;
      trackAPrevalence: number;
      trackBPrevalence: number;
      divergencePercent: number;
    }>;
  };
  convergence: {
    strongConvergences: Array<{
      dimension: string;
      value: string;
      convergenceRatio: number;
      crossTrack: boolean;
      competitorsIncreasing: number;
      totalCompetitors: number;
    }>;
    newAlerts: Array<{
      dimension: string;
      value: string;
      convergenceRatio: number;
    }>;
  };
  gaps: {
    priorityGaps: Array<{
      dimension: string;
      value: string;
      clientPrevalence: number;
      competitorPrevalence: number;
      gapSize: number;
      velocityDirection: string;
      recommendation: string;
      competitorExamples?: Array<{ adId: string; competitorName: string }>;
    }>;
    strengths: Array<{
      dimension: string;
      value: string;
      clientPrevalence: number;
      competitorPrevalence: number;
    }>;
    summary: {
      biggestOpportunity: string;
      strongestMatch: string;
      totalGapsIdentified: number;
    };
  } | null;
  rawPrevalence?: Array<{
    dimension: string;
    value: string;
    weightedPrevalence: number;
    adCount: number;
  }>;
  breakouts: {
    events: Array<{
      competitorName: string;
      cohortStart: string;
      cohortEnd: string;
      totalInCohort: number;
      survivorsCount: number;
      survivalRate: number;
      topSurvivorTraits: string[];
      analysisSummary: string | null;
      survivorAdIds?: string[];
    }>;
    cashCows: Array<{
      adId: string;
      competitorName: string;
      daysActive: number;
      traits: string[];
    }>;
    winningPatterns: Array<{
      dimension: string;
      value: string;
      frequency: number;
      avgLift: number;
      confidence: number;
    }>;
  } | null;
  clientPatterns: Array<{
    dimension: string;
    value: string;
    prevalence: number;
  }> | null;
  metadata: {
    totalTaggedAds: number;
    competitorCount: number;
    snapshotCount: number;
    dimensionCount: number;
    totalClientAds: number;
    totalCompetitorAds: number;
  };
}

export interface ReportData {
  clientBrand: Pick<ClientBrand, 'id' | 'name' | 'industry'>;
  allAds: Ad[];
  clientAds: Ad[];
  competitors: Competitor[];
  trends: DetectedTrend[];
  hookAnalysis: HookLibraryAnalysis | null;
  playbook: Record<string, unknown> | null;
  creativeIntelligence?: CreativeIntelligenceData | null;
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
    competitorAdsCount: number;
    competitorCount: number;
    clientAdsCount: number;
    metaConnected: boolean;
    generatedAt: string;
    brandName: string;
    industry: string;
  };
}
