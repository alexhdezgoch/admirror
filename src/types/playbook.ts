// Playbook Content Types
// Creative strategy brief synthesized from patterns + trends + competitor data

export type ConfidenceLevel = 'high' | 'medium' | 'hypothesis';

// Rich ad reference with visual data (replaces string IDs)
export interface AdReference {
  id: string;
  thumbnailUrl?: string;
  hookText?: string;
  headline?: string;
  competitorName?: string;
  format: 'video' | 'static' | 'carousel';
  daysActive?: number;
  score?: number;
}

// Prioritized action plan (new top-level section)
export interface ActionPlan {
  thisWeek: {
    action: string;
    rationale: string;
    confidence: ConfidenceLevel;
    confidenceReason: string;
  };
  nextTwoWeeks: Array<{
    action: string;
    testType: 'hook' | 'format' | 'angle' | 'creative';
    confidence: ConfidenceLevel;
  }>;
  thisMonth: Array<{
    action: string;
    strategicGoal: string;
    confidence: ConfidenceLevel;
  }>;
}

// Benchmark for context
export interface Benchmark {
  metric: string;
  yourValue: number;
  competitorAvg: number;
  multiplier: number;
  interpretation: string;
}

export interface PlaybookContent {
  // Section 0: Action Plan (prioritized timeline)
  actionPlan?: ActionPlan;

  // Section 1: Executive Summary
  executiveSummary: {
    topInsight: string;           // Main takeaway
    yourStrengths: string[];      // From winningPatterns
    biggestGaps: string[];        // From trends gap analysis
    quickWins: string[];          // Immediate actions
    benchmarks?: Benchmark[];     // Comparison metrics
  };

  // Section 2: Format Recommendations
  formatStrategy: {
    summary: string;
    recommendations: FormatRecommendation[];
  };

  // Section 3: Hooks & Angles to Test
  hookStrategy: {
    summary: string;
    toTest: HookToTest[];
    yourWinningHooks: string[];   // Keep doing these
  };

  // Section 4: Competitor Opportunities (Gaps)
  competitorGaps: {
    summary: string;
    opportunities: CompetitorOpportunity[];
  };

  // Section 5: Stop Doing
  stopDoing: {
    summary: string;
    patterns: StopDoingPattern[];
  };

  // Section 6: Top Performers to Study
  topPerformers: {
    competitorAds: TopCompetitorAd[];
  };

  // Metadata
  dataSnapshot: {
    myPatternsIncluded: boolean;
    clientAdsAnalyzed: number;
    competitorAdsAnalyzed: number;
    trendsIncorporated: number;
    generatedAt: string;
    lowDataMode?: boolean;  // True when generating competitor-focused playbook
  };
}

export interface FormatRecommendation {
  format: 'video' | 'static' | 'carousel';
  action: 'scale' | 'test' | 'reduce';
  rationale: string;
  yourData: string;           // From myPatterns
  competitorData: string;     // From trends
  confidence: ConfidenceLevel;
  confidenceReason: string;
  exampleAds?: AdReference[];
}

export interface HookToTest {
  hookTemplate: string;
  hookType: string;
  whyItWorks: string;
  source: 'competitor_trend' | 'your_winners' | 'gap_analysis';
  exampleAds: AdReference[];
  priority: 'high' | 'medium' | 'low';
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

export interface CompetitorOpportunity {
  patternName: string;
  description: string;
  competitorsUsing: string[];
  gapSeverity: 'critical' | 'moderate' | 'minor';
  adaptationSuggestion: string;
  exampleAds: AdReference[];
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

export interface StopDoingPattern {
  pattern: string;
  reason: string;
  yourData: string;           // Your performance
  competitorComparison: string;
  confidence: ConfidenceLevel;
  confidenceReason: string;
}

export interface TopCompetitorAd {
  adId: string;
  competitorName: string;
  whyItWorks: string;
  stealableElements: string[];
  adReference?: AdReference;
}

// Database row type
export interface PlaybookRow {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  generated_at: string;
  my_patterns_included: boolean;
  competitor_trends_count: number;
  competitor_ads_count: number;
  content: PlaybookContent;
  share_token: string;
  is_public: boolean;
  share_expires_at: string | null;
  status: 'generating' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
}

// API response types
export interface GeneratePlaybookRequest {
  brandId: string;
  title?: string;
}

// Error details for insufficient data responses
export interface InsufficientDataDetails {
  currentSpend?: number;
  requiredSpend?: number;
  currentAds?: number;
  requiredAds?: number;
  currentCompetitors?: number;
  requiredCompetitors?: number;
  message: string;
}

export interface GeneratePlaybookResponse {
  success: boolean;
  playbook?: PlaybookRow;
  error?: string;
  details?: InsufficientDataDetails;
}

export interface PlaybookListResponse {
  success: boolean;
  playbooks?: PlaybookRow[];
  error?: string;
}

export interface PlaybookShareRequest {
  isPublic: boolean;
  expiresInDays?: number; // Optional expiration
}

export interface PlaybookShareResponse {
  success: boolean;
  shareUrl?: string;
  shareToken?: string;
  error?: string;
}
