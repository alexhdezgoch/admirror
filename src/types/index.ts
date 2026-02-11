export type VelocityTier = 'scaling' | 'testing' | 'new';
export type AdFormat = 'video' | 'static' | 'carousel';
export type HookType = 'question' | 'statement' | 'social_proof' | 'urgency';
export type AdStatus = 'active' | 'archived' | 'all';

// Velocity signals for 5-signal classification system
export type VelocitySignal = 'burn_test' | 'cash_cow' | 'zombie' | 'rising_star' | 'standard';

// Grade for final ad score
export type AdGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export interface VelocityMetrics {
  tier: VelocityTier;
  signal: VelocitySignal;
  score: number;
  label: string;
}

export interface ValueMetrics {
  score: number;
  dreamOutcome: number;
  likelihood: number;
  timeDelay: number;
  effortSacrifice: number;
}

export interface AdScore {
  final: number;
  grade: AdGrade;
  velocity: VelocityMetrics;
  value: ValueMetrics;
  weights: { velocity: number; value: number };
  rationale: string;
}

export interface Ad {
  id: string;
  clientBrandId: string;      // Which client brand this ad belongs to
  competitorId: string;       // Which competitor this ad is from
  competitorName: string;
  competitorLogo: string;
  thumbnail: string;
  format: AdFormat;
  daysActive: number;
  variationCount: number;
  launchDate: string;
  hookText: string;
  hookType: HookType;
  headline: string;
  primaryText: string;
  cta: string;
  isVideo: boolean;
  videoDuration?: number;
  videoUrl?: string;
  creativeElements: string[];
  inSwipeFile: boolean;
  scoring: AdScore;
  isActive: boolean;          // Whether the ad is still active in Meta Ads Library
  lastSeenAt: string;         // Last time this ad was seen in a sync
  isClientAd?: boolean;       // True if this is the client's own ad (not a competitor's)
}

// Competitor being tracked (renamed from Brand)
export interface Competitor {
  id: string;
  name: string;
  logo: string;
  url: string;
  totalAds: number;
  avgAdsPerWeek: number;
  lastSyncedAt?: string;      // Last time ads were synced from this competitor
}

// Agency's client brand (workspace)
export interface ClientBrand {
  id: string;
  name: string;
  logo: string;              // Emoji
  industry: string;          // e.g., "Pet Supplements"
  color: string;             // Accent color (hex)
  adsLibraryUrl?: string;    // Meta Ads Library URL to track client's own ads
  createdAt: string;
  lastUpdated: string;
  competitors: Competitor[];
}

// Keep Brand as alias for backward compatibility during migration
export type Brand = Competitor;

export interface CreativePattern {
  id: string;
  name: string;
  description: string;
  adoptionRate: number;
  trend: 'rising' | 'stable' | 'declining';
  exampleAds: string[];
}

export interface TrendCard {
  id: string;
  patternName: string;
  adoptionRate: number;
  trend: 'rising' | 'stable' | 'declining';
  exampleAds: string[];
  description: string;
}

export interface HookData {
  text: string;
  type: HookType;
  frequency: number;
  adIds: string[];
}

export interface Analysis {
  id: string;
  name: string;
  competitors: string[];
  createdAt: string;
  totalAds: number;
}

// Client's own ads pulled from Meta Ads Manager
export interface ClientAd {
  id: string;
  clientBrandId: string;
  metaAdId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  // Hierarchy links
  campaignId?: string;
  adsetId?: string;
  // Creative
  thumbnailUrl?: string;
  imageUrl?: string;
  body?: string;
  title?: string;
  // Performance
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
  // Pattern fields
  emotionalAngle?: string;
  narrativeStructure?: string;
  // Timestamps
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Client's campaigns pulled from Meta
export interface ClientCampaign {
  id: string;
  clientBrandId: string;
  metaCampaignId: string;
  name: string;
  objective?: string;
  status: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Client's ad sets pulled from Meta
export interface ClientAdSet {
  id: string;
  clientBrandId: string;
  campaignId: string;
  metaAdsetId: string;
  name: string;
  status: string;
  dailyBudget?: number;
  optimizationGoal?: string;
  targeting?: Record<string, unknown>;
  // Ad-set-level insights
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  revenue: number;
  roas: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Audience breakdown data at ad-set level
export interface ClientAdBreakdown {
  id: string;
  clientBrandId: string;
  metaAdsetId: string;
  breakdownType: 'age' | 'gender' | 'publisher_platform';
  breakdownValue: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  conversions: number;
  revenue: number;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}
