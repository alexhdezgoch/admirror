export interface HookAnalysis {
  description: string;
  whyItWorks: string;
}

export interface WhyItWon {
  summary: string;
  keyFactors: string[];
}

export interface SwipeFileInsights {
  howToAdapt: string;
  keep: string[];
  swap: string[];
  enhancementIdea: string;
}

export interface CreativeBlueprint {
  openingHook: string;
  storytellingStructure: string;
  visualStyle: string;
  pacing: string;
  audioCues?: string;  // Music style, BPM estimate, sound effects, voiceover tone
}

export interface FrameByFrame {
  timestamp: string;      // Supports ranges: "0:00-0:03"
  scene?: string;         // Scene name: "Opening hook", "Problem setup"
  description: string;
  visualElements: string;
  text: string;
  audio?: string;         // Audio description for this segment
  transition?: string;    // "cut", "fade", "zoom", "swipe", etc.
}

export interface VideoMetadata {
  estimatedDuration: string;
  sceneCount: number;
  primaryFormat: 'talking head' | 'product demo' | 'lifestyle' | 'testimonial' | 'animation' | 'UGC' | 'mixed' | string;
  pacingStyle: 'fast' | 'medium' | 'slow';
  bpmEstimate: number | null;
}

export interface ZoneAnalysis {
  zone: 'top' | 'center' | 'bottom';
  description: string;
  text: string;
}

export interface HormoziScores {
  dreamOutcome: number;      // 1-10: How desirable is the result?
  likelihood: number;        // 1-10: Do they believe it will happen?
  timeDelay: number;         // 1-10: How long until results? (lower = better)
  effortSacrifice: number;   // 1-10: How hard is it? (lower = better)
  valueEquation: number;     // Calculated: (dream + likelihood) - (time + effort)
  hookType: 'Speed-Focused' | 'Trust-Focused' | 'Low-Friction' | 'Outcome-Focused' | 'Balanced';
}

export interface AdAnalysis {
  id: string;
  adId: string;
  hookAnalysis: HookAnalysis;
  whyItWon: WhyItWon;
  swipeFile: SwipeFileInsights;
  creativeBlueprint: CreativeBlueprint;
  frameByFrame?: FrameByFrame[];
  zoneAnalysis?: ZoneAnalysis[];
  videoMetadata?: VideoMetadata;  // Video-specific metadata (duration, scene count, format, pacing)
  hormoziScores?: HormoziScores;
  analyzedAt: string;
  isVideo: boolean;
}

export interface AnalysisRequest {
  adId: string;
  imageUrl?: string;
  videoUrl?: string;
  isVideo: boolean;
  competitorName: string;
  hookText: string;
  headline: string;
  primaryText: string;
  cta: string;
  format: string;
  daysActive: number;
  variationCount: number;
  scoring: {
    final: number;
    grade: string;
    velocity: {
      score: number;
      signal: string;
    };
  };
  forceReanalyze?: boolean;  // If true, bypasses cache and runs fresh analysis
}

export interface AnalysisResponse {
  success: boolean;
  analysis?: AdAnalysis;
  cached?: boolean;          // True if result was retrieved from cache
  analyzedAt?: string;       // Timestamp of when analysis was performed
  error?: string;
}

// Database type for stored analysis
export interface StoredAnalysis {
  id: string;
  ad_id: string;
  user_id: string;
  analysis: AdAnalysis;
  analyzed_at: string;
}

// Trend Detection Types
export type TrendCategory = 'Visual' | 'Copy' | 'Color' | 'Seasonal' | 'Storytelling' | 'Format' | 'Hormozi' | 'Hook';

export interface TrendEvidence {
  adCount: number;
  avgScore: number;
  sampleAdIds: string[];
}

export interface DetectedTrend {
  trendName: string;
  category: TrendCategory;
  description: string;
  evidence: TrendEvidence;
  whyItWorks: string;
  recommendedAction: string;
  recencyScore: number; // 1-10, higher = more recent
}

export interface TrendAnalysisRequest {
  brandId: string;
  ads: {
    id: string;
    competitorName: string;
    format: string;
    daysActive: number;
    score: number;
    hookText: string;
    primaryText: string;
    launchDate: string;
    creativeElements: string[];
  }[];
}

export interface TrendAnalysisSummary {
  totalAdsAnalyzed: number;
  recentAds: number;
  avgRecentScore: number;
}

export interface TrendAnalysisResponse {
  success: boolean;
  trends?: DetectedTrend[];
  summary?: TrendAnalysisSummary;
  error?: string;
}

// ==========================================
// AI Hook Analysis Types
// ==========================================

export type AdvancedHookType =
  | 'curiosity_gap'      // "You won't believe what happened..."
  | 'transformation'     // "I went from X to Y..."
  | 'contrarian'         // "Everything you know about X is wrong"
  | 'number_driven'      // "7 ways to...", "83% of people..."
  | 'pain_point'         // "Tired of X?", "Struggling with Y?"
  | 'aspirational'       // "Imagine if...", "What if you could..."
  | 'fear_based'         // "Don't make this mistake..."
  | 'authority'          // "Experts say...", "Doctors recommend..."
  | 'story_opener'       // "Last year, I...", "My client Sarah..."
  | 'direct_benefit'     // "Get X in Y days"
  | 'question'           // Any question format
  | 'challenge';         // "I bet you can't...", "Try this..."

export interface AIHookAnalysis {
  // Effectiveness Analysis
  emotionalTriggers: string[];           // e.g., ["curiosity", "fear of missing out", "aspiration"]
  persuasionTechnique: string;           // e.g., "Pattern Interrupt", "Social Proof", "Scarcity"
  psychologicalPrinciple: string;        // e.g., "Loss Aversion", "Bandwagon Effect"
  whyItWorks: string;                    // 2-3 sentence explanation

  // Enhanced Categorization
  advancedType: AdvancedHookType;
  confidence: number;                    // 0-100

  // Scoring
  attentionScore: number;                // 1-10: How well does it grab attention?
  clarityScore: number;                  // 1-10: How clear is the message?
  relevanceScore: number;                // 1-10: How relevant to target audience?
  overallScore: number;                  // 1-10: Combined effectiveness
}

export interface HookRecommendation {
  suggestedHook: string;
  basedOn: string[];                     // Hook texts that inspired this
  targetEmotion: string;
  estimatedEffectiveness: number;        // 1-10
  reasoning: string;
}

export interface HookPattern {
  name: string;
  description: string;
  frequency: number;
  avgScore: number;
  exampleHooks: string[];
}

export interface HookLibrarySummary {
  dominantTypes: string[];
  emotionalThemes: string[];
  gaps: string[];                        // Missing hook types/approaches
  topPerformingStyle: string;
}

export interface EnhancedHookData {
  text: string;
  type: string;                          // Basic type (question, statement, etc.)
  frequency: number;
  adIds: string[];
  aiAnalysis?: AIHookAnalysis;
}

export interface HookLibraryAnalysis {
  hooks: EnhancedHookData[];
  patterns: HookPattern[];
  recommendations: HookRecommendation[];
  summary: HookLibrarySummary;
  analyzedAt: string;
}

export interface HookAnalysisRequest {
  brandId: string;
  hooks: {
    text: string;
    type: string;
    frequency: number;
    adIds: string[];
  }[];
}

export interface HookAnalysisResponse {
  success: boolean;
  analysis?: HookLibraryAnalysis;
  cached?: boolean;
  analyzedAt?: string;
  error?: string;
}
