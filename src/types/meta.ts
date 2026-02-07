// Meta Marketing API Type Definitions

// ============================================
// CONNECTION & AUTH TYPES
// ============================================

export interface MetaConnection {
  id: string;
  brandId: string;
  userId: string;
  metaUserId: string;
  metaAdAccountId: string;
  metaAdAccountName?: string;
  accessToken: string;
  tokenExpiresAt?: string;
  status: MetaConnectionStatus;
  lastSyncedAt?: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export type MetaConnectionStatus = 'active' | 'expired' | 'disconnected';

export interface TokenInfo {
  accessToken: string;
  expiresAt?: Date;
  isExpired: boolean;
  daysUntilExpiry: number;
  needsRefresh: boolean;
}

// ============================================
// AD ACCOUNT TYPES
// ============================================

export interface MetaAdAccount {
  id: string;
  name: string;
  accountId: string;
  accountStatus: number;
  currency: string;
  businessName?: string;
}

export interface MetaAdAccountResponse {
  data: MetaAdAccount[];
  paging?: MetaPaging;
}

// ============================================
// AD TYPES
// ============================================

export interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  created_time?: string;
  updated_time?: string;
  creative?: MetaAdCreative;
}

export interface MetaAdCreative {
  id: string;
  thumbnail_url?: string;
  image_url?: string;
  video_id?: string;
  body?: string;
  title?: string;
  object_story_spec?: {
    link_data?: {
      message?: string;
      link?: string;
      call_to_action?: {
        type: string;
      };
    };
    video_data?: {
      video_id?: string;
      message?: string;
      call_to_action?: {
        type: string;
      };
    };
  };
}

export interface MetaAdsResponse {
  data: MetaAd[];
  paging?: MetaPaging;
}

// ============================================
// INSIGHTS TYPES
// ============================================

export interface MetaAdInsight {
  ad_id: string;
  ad_name?: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  reach?: string;
  frequency?: string;
  actions?: MetaAction[];
  action_values?: MetaActionValue[];
  cost_per_action_type?: MetaActionCost[];
  video_p25_watched_actions?: MetaVideoAction[];
  video_p50_watched_actions?: MetaVideoAction[];
  video_p75_watched_actions?: MetaVideoAction[];
  video_p100_watched_actions?: MetaVideoAction[];
}

export interface MetaAction {
  action_type: string;
  value: string;
}

export interface MetaActionValue {
  action_type: string;
  value: string;
}

export interface MetaActionCost {
  action_type: string;
  value: string;
}

export interface MetaVideoAction {
  action_type: string;
  value: string;
}

export interface MetaInsightsResponse {
  data: MetaAdInsight[];
  paging?: MetaPaging;
}

// ============================================
// PAGINATION
// ============================================

export interface MetaPaging {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
  previous?: string;
}

// ============================================
// PATTERN ANALYSIS TYPES
// ============================================

export interface PatternAdDetail {
  id: string;
  name: string;
  thumbnailUrl?: string;
  roas: number;
}

export interface Pattern {
  name: string;
  description: string;
  avgRoas: number;
  avgSpend: number;
  adCount: number;
  examples: string[]; // ad IDs
  exampleAds?: PatternAdDetail[];
  competitorInsight?: string;
  creativeAttributes?: string[];
  wowChange?: number;
}

export interface Recommendation {
  title: string;
  description: string;
  expectedLift?: string;
  priority: 'high' | 'medium' | 'low';
  relatedAdIds?: string[];
}

export interface TestIdea {
  title: string;
  description: string;
  basis: string; // Why this is suggested
  competitorBenchmark?: string;
}

export interface DataQuality {
  daysOfData: number;
  adsAnalyzed: number;
  isReliable: boolean;
}

export interface MyPatternAnalysis {
  winningPatterns: Pattern[];
  losingPatterns: Pattern[];
  doubleDown: Recommendation[];
  stopDoing: string[];
  testNext: TestIdea[];
  summary: string;
  analyzedAt: string;
  adsAnalyzed: number;
  totalSpend?: number;  // Total ad spend for validation gates
  dataQuality?: DataQuality;
  adDetails?: PatternAdDetail[];
  accountAvgRoas?: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface MetaApiError {
  message: string;
  type: string;
  code: number;
  error_subcode?: number;
  fbtrace_id?: string;
}

export interface MetaApiResponse<T> {
  data?: T;
  error?: MetaApiError;
}

// ============================================
// SYNC TYPES
// ============================================

export interface MetaSyncResult {
  success: boolean;
  totalAds: number;
  adsWithInsights: number;
  syncedAt: string;
  error?: string;
}

// ============================================
// PERFORMANCE METRICS
// ============================================

export interface PerformanceSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  avgCtr: number;
  avgCpm: number;
  avgCpc: number;
  avgRoas: number;
  avgCpa: number;
}

export interface PerformanceByPeriod {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
}

export interface PerformanceBreakdown {
  label: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  percentage: number;
}
