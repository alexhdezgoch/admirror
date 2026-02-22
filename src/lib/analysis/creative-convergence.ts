import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';
import { fetchTaggedAds, type TaggedAd, type CompetitorInfo } from './creative-velocity';

const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

export type ConvergenceClassification =
  | 'STRONG_CONVERGENCE'
  | 'MODERATE_CONVERGENCE'
  | 'EMERGING_PATTERN'
  | 'NO_CONVERGENCE';

export interface CompetitorAdoption {
  competitorId: string;
  competitorName: string;
  track: string;
  currentPrevalence: number;
  previousPrevalence: number;
  velocityPercent: number;
  increasing: boolean;
  exampleAdIds: string[];
}

export interface ConvergenceElement {
  dimension: string;
  value: string;
  convergenceRatio: number;
  adjustedScore: number;
  crossTrack: boolean;
  classification: ConvergenceClassification;
  confidence: number;
  competitorsIncreasing: number;
  totalCompetitors: number;
  trackAIncreasing: number;
  trackBIncreasing: number;
  competitors: CompetitorAdoption[];
  isNewAlert: boolean;
}

export interface ConvergenceAnalysis {
  competitiveSet: string;
  brandId: string;
  analysisDate: string;
  totalCompetitors: number;
  confidence: number;
  strongConvergences: ConvergenceElement[];
  moderateConvergences: ConvergenceElement[];
  emergingPatterns: ConvergenceElement[];
  marketShiftAlerts: ConvergenceElement[];
}

export interface ConvergencePipelineStats {
  brandsAnalyzed: number;
  snapshotsSaved: number;
  alertsGenerated: number;
  failed: number;
  durationMs: number;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Confidence modifier based on competitive set size.
 * Small sets (3) → ~0.55, medium (5) → ~0.71, large (10+) → 1.0
 */
export function calculateConfidence(totalCompetitors: number): number {
  if (totalCompetitors <= 0) return 0;
  return round4(Math.min(1.0, Math.sqrt(totalCompetitors / 10)));
}

/**
 * Classify convergence based on ratio and cross-track signal.
 */
export function classifyConvergence(convergenceRatio: number, crossTrack: boolean): ConvergenceClassification {
  if (convergenceRatio >= 0.6 && crossTrack) return 'STRONG_CONVERGENCE';
  if (convergenceRatio >= 0.6) return 'MODERATE_CONVERGENCE';
  if (convergenceRatio >= 0.4) return 'EMERGING_PATTERN';
  return 'NO_CONVERGENCE';
}

function getTagValue(ad: TaggedAd, dimension: string): string | null {
  return ad.tags[dimension] || ad.videoTags[dimension] || null;
}

/**
 * Calculate convergence for a single taxonomy element across all competitors.
 * For each competitor: compare prevalence of this value in current vs previous period.
 * convergence_ratio = competitors_increasing / total_active_competitors
 */
export function calculateConvergence(
  taggedAds: TaggedAd[],
  competitors: CompetitorInfo[],
  dimension: string,
  value: string,
  currentCutoff: string,
  previousCutoff: string,
): ConvergenceElement {
  const adoptions: CompetitorAdoption[] = [];
  let trackAIncreasing = 0;
  let trackBIncreasing = 0;
  let totalActive = 0;
  let totalIncreasing = 0;

  for (const comp of competitors) {
    const compAds = taggedAds.filter(a => a.competitor_id === comp.id);
    const currentAds = compAds.filter(a => a.launch_date >= currentCutoff);
    const previousAds = compAds.filter(a => a.launch_date >= previousCutoff && a.launch_date < currentCutoff);

    if (currentAds.length === 0) continue;

    totalActive++;

    const currentWithValue = currentAds.filter(a => getTagValue(a, dimension) === value);
    const previousWithValue = previousAds.filter(a => getTagValue(a, dimension) === value);

    const currentPrevalence = currentWithValue.length / currentAds.length;
    const previousPrevalence = previousAds.length > 0
      ? previousWithValue.length / previousAds.length
      : 0;

    const increasing = currentPrevalence > previousPrevalence;

    let velocityPercent = 0;
    if (previousPrevalence > 0.01) {
      velocityPercent = (currentPrevalence - previousPrevalence) / previousPrevalence;
    } else if (currentPrevalence > 0.01) {
      velocityPercent = 1;
    }

    if (increasing) {
      totalIncreasing++;
      if (comp.track === 'consolidator') trackAIncreasing++;
      if (comp.track === 'velocity_tester') trackBIncreasing++;
    }

    adoptions.push({
      competitorId: comp.id,
      competitorName: comp.name || 'Unknown',
      track: comp.track || 'unclassified',
      currentPrevalence: round4(currentPrevalence),
      previousPrevalence: round4(previousPrevalence),
      velocityPercent: round2(velocityPercent),
      increasing,
      exampleAdIds: currentWithValue.slice(0, 3).map(a => a.id),
    });
  }

  if (totalActive === 0) {
    return {
      dimension, value,
      convergenceRatio: 0, adjustedScore: 0, crossTrack: false,
      classification: 'NO_CONVERGENCE',
      confidence: 0, competitorsIncreasing: 0, totalCompetitors: 0,
      trackAIncreasing: 0, trackBIncreasing: 0,
      competitors: adoptions, isNewAlert: false,
    };
  }

  const convergenceRatio = totalIncreasing / totalActive;
  const crossTrack = trackAIncreasing > 0 && trackBIncreasing > 0;
  const adjustedScore = Math.min(1.0, convergenceRatio * (crossTrack ? 1.5 : 1.0));
  const confidence = calculateConfidence(totalActive);
  const classification = classifyConvergence(convergenceRatio, crossTrack);

  return {
    dimension, value,
    convergenceRatio: round4(convergenceRatio),
    adjustedScore: round4(adjustedScore),
    crossTrack,
    classification,
    confidence,
    competitorsIncreasing: totalIncreasing,
    totalCompetitors: totalActive,
    trackAIncreasing,
    trackBIncreasing,
    competitors: adoptions,
    isNewAlert: false,
  };
}

/**
 * Run convergence analysis for a single brand's competitive set.
 */
export async function analyzeCreativeConvergence(brandId: string): Promise<ConvergenceAnalysis | null> {
  const fetchResult = await fetchTaggedAds(brandId, 60);
  if (!fetchResult) return null;

  const { brandName, competitors, taggedAds } = fetchResult;
  if (taggedAds.length === 0) return null;

  const today = new Date();
  const currentCutoff = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const previousCutoff = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const snapshotDate = today.toISOString().split('T')[0];

  const totalCompetitors = competitors.length;
  const confidence = calculateConfidence(totalCompetitors);

  const elements: ConvergenceElement[] = [];

  for (const [dimension, values] of Object.entries(ALL_DIMENSIONS)) {
    for (const value of values) {
      const element = calculateConvergence(taggedAds, competitors, dimension, value, currentCutoff, previousCutoff);
      if (element.competitorsIncreasing > 0) {
        elements.push(element);
      }
    }
  }

  // Detect new alerts by comparing with previous snapshots
  const supabase = getSupabaseAdmin();
  const { data: previousStrong } = await supabase
    .from('convergence_snapshots')
    .select('dimension, value')
    .eq('brand_id', brandId)
    .eq('classification', 'STRONG_CONVERGENCE')
    .lt('snapshot_date', snapshotDate);

  const previousStrongSet = new Set(
    (previousStrong || []).map((a: { dimension: string; value: string }) => `${a.dimension}:${a.value}`)
  );

  const marketShiftAlerts: ConvergenceElement[] = [];
  for (const element of elements) {
    if (element.classification === 'STRONG_CONVERGENCE') {
      if (!previousStrongSet.has(`${element.dimension}:${element.value}`)) {
        element.isNewAlert = true;
        marketShiftAlerts.push(element);
      }
    }
  }

  // Sort by adjusted score descending
  elements.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // Save snapshots for elements with any convergence
  const snapshots = elements
    .filter(e => e.classification !== 'NO_CONVERGENCE')
    .map(e => ({
      brand_id: brandId,
      snapshot_date: snapshotDate,
      dimension: e.dimension,
      value: e.value,
      convergence_ratio: e.convergenceRatio,
      adjusted_score: e.adjustedScore,
      classification: e.classification,
      cross_track: e.crossTrack,
      confidence: e.confidence,
      competitors_increasing: e.competitorsIncreasing,
      total_competitors: e.totalCompetitors,
      track_a_increasing: e.trackAIncreasing,
      track_b_increasing: e.trackBIncreasing,
      competitor_details: e.competitors.filter(c => c.increasing),
      is_new_alert: e.isNewAlert,
    }));

  if (snapshots.length > 0) {
    await supabase
      .from('convergence_snapshots')
      .upsert(snapshots, {
        onConflict: 'brand_id,snapshot_date,dimension,value',
      });
  }

  return {
    competitiveSet: `${brandName} Competitors`,
    brandId,
    analysisDate: snapshotDate,
    totalCompetitors,
    confidence,
    strongConvergences: elements.filter(e => e.classification === 'STRONG_CONVERGENCE'),
    moderateConvergences: elements.filter(e => e.classification === 'MODERATE_CONVERGENCE'),
    emergingPatterns: elements.filter(e => e.classification === 'EMERGING_PATTERN'),
    marketShiftAlerts,
  };
}

/**
 * Run convergence analysis for all active brands (weekly cron).
 */
export async function runConvergencePipeline(): Promise<ConvergencePipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: ConvergencePipelineStats = {
    brandsAnalyzed: 0,
    snapshotsSaved: 0,
    alertsGenerated: 0,
    failed: 0,
    durationMs: 0,
  };

  const { data: brands } = await supabase
    .from('client_brands')
    .select('id');

  if (!brands || brands.length === 0) {
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  for (const brand of brands) {
    try {
      const result = await analyzeCreativeConvergence(brand.id);
      if (result) {
        stats.brandsAnalyzed++;
        stats.snapshotsSaved += result.strongConvergences.length + result.moderateConvergences.length + result.emergingPatterns.length;
        stats.alertsGenerated += result.marketShiftAlerts.length;
      }
    } catch (error) {
      console.error(`[CONVERGENCE] Error analyzing brand ${brand.id}:`, error);
      stats.failed++;
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
