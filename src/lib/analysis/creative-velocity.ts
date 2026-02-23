import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';
import type { CompetitorTrack } from '@/lib/classification/competitor-tracks';

// Merge visual + video dimensions into one map
const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

const VELOCITY_ACCELERATING_THRESHOLD = 0.3;
const VELOCITY_DECLINING_THRESHOLD = -0.3;

type TrackFilter = 'all' | 'consolidator' | 'velocity_tester';
type Direction = 'accelerating' | 'declining' | 'stable';

export interface ElementVelocity {
  dimension: string;
  value: string;
  currentPrevalence: number;
  previousPrevalence: number;
  velocityPercent: number;
  direction: Direction;
  adCount: number;
}

export interface TrackDivergence {
  dimension: string;
  value: string;
  consolidatorPrevalence: number;
  velocityTesterPrevalence: number;
  divergencePercent: number;
  direction: string;
}

export interface VelocityAnalysis {
  competitiveSet: string;
  brandId: string;
  analysisDate: string;
  period: string;
  topAccelerating: ElementVelocity[];
  topDeclining: ElementVelocity[];
  fullDimensionBreakdown: Record<string, Record<string, {
    current: number;
    previous: number;
    velocity: number;
    direction: Direction;
  }>>;
  trackDivergences: TrackDivergence[];
}

export interface VelocityPipelineStats {
  brandsAnalyzed: number;
  snapshotsSaved: number;
  failed: number;
  durationMs: number;
}

export interface TaggedAd {
  id: string;
  competitor_id: string;
  signal_strength: number;
  competitor_track: string | null;
  launch_date: string;
  is_video: boolean;
  tags: Record<string, string | null>;
  videoTags: Record<string, string | null>;
}

export interface CompetitorInfo {
  id: string;
  name: string;
  track: string | null;
}

export interface FetchTaggedAdsResult {
  brandName: string;
  competitors: CompetitorInfo[];
  taggedAds: TaggedAd[];
}

/**
 * Fetch tagged ads for a brand's competitive set.
 * Shared helper used by both velocity and convergence analysis.
 */
export async function fetchTaggedAds(brandId: string, lookbackDays: number): Promise<FetchTaggedAdsResult | null> {
  const supabase = getSupabaseAdmin();

  const { data: brand } = await supabase
    .from('client_brands')
    .select('id, name')
    .eq('id', brandId)
    .single();

  if (!brand) return null;

  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name, track')
    .eq('brand_id', brandId);

  if (!competitors || competitors.length === 0) return null;

  const competitorIds = competitors.map(c => c.id);
  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: ads } = await supabase
    .from('ads')
    .select('id, competitor_id, signal_strength, competitor_track, launch_date, is_video')
    .in('competitor_id', competitorIds)
    .gte('launch_date', cutoffDate)
    .not('signal_strength', 'is', null);

  if (!ads || ads.length === 0) return null;

  const adIds = ads.map(a => a.id);

  const { data: creativeTags } = await supabase
    .from('creative_tags')
    .select('ad_id, format_type, hook_type_visual, human_presence, text_overlay_density, text_overlay_position, color_temperature, background_style, product_visibility, cta_visual_style, visual_composition, brand_element_presence, emotion_energy_level')
    .in('ad_id', adIds);

  const tagsByAdId = new Map<string, Record<string, string | null>>();
  for (const tag of creativeTags || []) {
    const adId = tag.ad_id as string;
    const { ad_id: _, ...rest } = tag;
    tagsByAdId.set(adId, rest as Record<string, string | null>);
  }

  const videoAdIds = ads.filter(a => a.is_video).map(a => a.id);
  const videoTagsByAdId = new Map<string, Record<string, string | null>>();

  if (videoAdIds.length > 0) {
    const { data: videoTags } = await supabase
      .from('video_tags')
      .select('ad_id, script_structure, verbal_hook_type, pacing, audio_style, video_duration_bucket, narrative_arc, opening_frame')
      .in('ad_id', videoAdIds);

    for (const tag of videoTags || []) {
      const adId = tag.ad_id as string;
      const { ad_id: _, ...rest } = tag;
      videoTagsByAdId.set(adId, rest as Record<string, string | null>);
    }
  }

  const emptyTags: Record<string, string | null> = {};
  const taggedAds: TaggedAd[] = ads
    .filter(ad => tagsByAdId.has(ad.id))
    .map(ad => ({
      id: ad.id,
      competitor_id: ad.competitor_id,
      signal_strength: ad.signal_strength ?? 1,
      competitor_track: ad.competitor_track,
      launch_date: ad.launch_date,
      is_video: ad.is_video,
      tags: tagsByAdId.get(ad.id) || emptyTags,
      videoTags: videoTagsByAdId.get(ad.id) || emptyTags,
    }));

  return {
    brandName: brand.name,
    competitors: competitors.map(c => ({
      id: c.id,
      name: c.name,
      track: c.track as string | null,
    })),
    taggedAds,
  };
}

/**
 * Calculate weighted prevalence for each taxonomy value in a set of ads.
 * Returns { dimension -> { value -> prevalence } }
 */
export function calculateWeightedPrevalence(
  ads: TaggedAd[],
  trackFilter: TrackFilter
): Record<string, Record<string, number>> {
  const filtered = trackFilter === 'all'
    ? ads
    : ads.filter(ad => ad.competitor_track === trackFilter);

  if (filtered.length === 0) return {};

  const totalSignal = filtered.reduce((sum, ad) => sum + (ad.signal_strength || 1), 0);
  if (totalSignal === 0) return {};

  const prevalence: Record<string, Record<string, number>> = {};

  for (const [dimension, values] of Object.entries(ALL_DIMENSIONS)) {
    prevalence[dimension] = {};
    for (const value of values) {
      prevalence[dimension][value] = 0;
    }
  }

  for (const ad of filtered) {
    const weight = ad.signal_strength || 1;

    // Visual tags (from creative_tags)
    for (const dimension of Object.keys(TAXONOMY_DIMENSIONS)) {
      const value = ad.tags[dimension];
      if (value && prevalence[dimension]?.[value] !== undefined) {
        prevalence[dimension][value] += weight;
      }
    }

    // Video tags (from video_tags) — only for video ads
    if (ad.is_video) {
      for (const dimension of Object.keys(VIDEO_TAXONOMY_DIMENSIONS)) {
        const value = ad.videoTags[dimension];
        if (value && prevalence[dimension]?.[value] !== undefined) {
          prevalence[dimension][value] += weight;
        }
      }
    }
  }

  // Normalize to 0-1
  for (const dimension of Object.keys(prevalence)) {
    // Use per-dimension total (only ads that have this tag contribute)
    const dimTotal = Object.values(prevalence[dimension]).reduce((sum, v) => sum + v, 0);
    if (dimTotal > 0) {
      for (const value of Object.keys(prevalence[dimension])) {
        prevalence[dimension][value] = prevalence[dimension][value] / dimTotal;
      }
    }
  }

  return prevalence;
}

/**
 * Calculate velocity between two prevalence snapshots.
 * velocity = (current - previous) / previous
 */
export function calculateVelocity(
  current: Record<string, Record<string, number>>,
  previous: Record<string, Record<string, number>>
): ElementVelocity[] {
  const velocities: ElementVelocity[] = [];

  for (const [dimension, values] of Object.entries(current)) {
    for (const [value, currentPrevalence] of Object.entries(values)) {
      const previousPrevalence = previous[dimension]?.[value] ?? 0;

      let velocityPercent = 0;
      if (previousPrevalence > 0.01) {
        velocityPercent = (currentPrevalence - previousPrevalence) / previousPrevalence;
      } else if (currentPrevalence > 0.01) {
        velocityPercent = 1; // New element appeared — 100% growth
      }

      let direction: Direction = 'stable';
      if (velocityPercent > VELOCITY_ACCELERATING_THRESHOLD) direction = 'accelerating';
      else if (velocityPercent < VELOCITY_DECLINING_THRESHOLD) direction = 'declining';

      velocities.push({
        dimension,
        value,
        currentPrevalence: Math.round(currentPrevalence * 10000) / 10000,
        previousPrevalence: Math.round(previousPrevalence * 10000) / 10000,
        velocityPercent: Math.round(velocityPercent * 100) / 100,
        direction,
        adCount: 0, // filled by caller
      });
    }
  }

  return velocities;
}

/**
 * Detect divergences between Track A and Track B prevalence.
 */
export function detectTrackDivergences(
  consolidatorPrevalence: Record<string, Record<string, number>>,
  velocityTesterPrevalence: Record<string, Record<string, number>>,
  threshold = 0.15
): TrackDivergence[] {
  const divergences: TrackDivergence[] = [];

  for (const [dimension, values] of Object.entries(consolidatorPrevalence)) {
    for (const [value, consPrevalence] of Object.entries(values)) {
      const vtPrevalence = velocityTesterPrevalence[dimension]?.[value] ?? 0;
      const diff = vtPrevalence - consPrevalence;

      if (Math.abs(diff) >= threshold) {
        divergences.push({
          dimension,
          value,
          consolidatorPrevalence: Math.round(consPrevalence * 10000) / 10000,
          velocityTesterPrevalence: Math.round(vtPrevalence * 10000) / 10000,
          divergencePercent: Math.round(diff * 100) / 100,
          direction: diff > 0
            ? 'velocity_testers_leading'
            : 'consolidators_leading',
        });
      }
    }
  }

  // Sort by absolute divergence
  divergences.sort((a, b) => Math.abs(b.divergencePercent) - Math.abs(a.divergencePercent));
  return divergences;
}

/**
 * Run velocity analysis for a single brand's competitive set.
 */
export async function analyzeCreativeVelocity(brandId: string): Promise<VelocityAnalysis | null> {
  const fetchResult = await fetchTaggedAds(brandId, 90);
  if (!fetchResult) return null;

  const { brandName, taggedAds } = fetchResult;

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sixtyDaysAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 7. Split into current (0-30d) and previous (30-60d) periods
  const currentAds = taggedAds.filter(ad => ad.launch_date >= thirtyDaysAgo);
  const previousAds = taggedAds.filter(ad => ad.launch_date >= sixtyDaysAgo && ad.launch_date < thirtyDaysAgo);

  // 8. Calculate prevalence for each track filter
  const currentAll = calculateWeightedPrevalence(currentAds, 'all');
  const previousAll = calculateWeightedPrevalence(previousAds, 'all');

  const currentCons = calculateWeightedPrevalence(currentAds, 'consolidator');
  const currentVT = calculateWeightedPrevalence(currentAds, 'velocity_tester');

  // 9. Calculate velocities
  const velocities = calculateVelocity(currentAll, previousAll);

  // Count ads per value for context
  for (const v of velocities) {
    v.adCount = currentAds.filter(ad => {
      const tagValue = ad.tags[v.dimension] || ad.videoTags[v.dimension];
      return tagValue === v.value;
    }).length;
  }

  // 10. Sort by absolute velocity
  const sorted = [...velocities]
    .filter(v => v.currentPrevalence > 0.01 || v.previousPrevalence > 0.01)
    .sort((a, b) => Math.abs(b.velocityPercent) - Math.abs(a.velocityPercent));

  const topAccelerating = sorted.filter(v => v.direction === 'accelerating').slice(0, 10);
  const topDeclining = sorted.filter(v => v.direction === 'declining').slice(0, 10);

  // 11. Build full dimension breakdown
  const fullDimensionBreakdown: VelocityAnalysis['fullDimensionBreakdown'] = {};
  for (const v of velocities) {
    if (!fullDimensionBreakdown[v.dimension]) {
      fullDimensionBreakdown[v.dimension] = {};
    }
    fullDimensionBreakdown[v.dimension][v.value] = {
      current: v.currentPrevalence,
      previous: v.previousPrevalence,
      velocity: v.velocityPercent,
      direction: v.direction,
    };
  }

  // 12. Detect track divergences
  const trackDivergences = detectTrackDivergences(currentCons, currentVT);

  // 13. Save prevalence snapshots for historical tracking
  const snapshotDate = today.toISOString().split('T')[0];
  const snapshotsToSave: Array<{
    brand_id: string;
    snapshot_date: string;
    period_start: string;
    period_end: string;
    track_filter: TrackFilter;
    dimension: string;
    value: string;
    weighted_prevalence: number;
    ad_count: number;
    total_signal_strength: number;
  }> = [];

  const trackConfigs: Array<{ filter: TrackFilter; prevalence: typeof currentAll }> = [
    { filter: 'all', prevalence: currentAll },
    { filter: 'consolidator', prevalence: currentCons },
    { filter: 'velocity_tester', prevalence: currentVT },
  ];

  for (const { filter, prevalence } of trackConfigs) {
    const filteredAds = filter === 'all'
      ? currentAds
      : currentAds.filter(ad => ad.competitor_track === filter);
    const totalSignal = filteredAds.reduce((sum, ad) => sum + (ad.signal_strength || 1), 0);

    for (const [dimension, values] of Object.entries(prevalence)) {
      for (const [value, wp] of Object.entries(values)) {
        if (wp > 0) {
          snapshotsToSave.push({
            brand_id: brandId,
            snapshot_date: snapshotDate,
            period_start: thirtyDaysAgo,
            period_end: snapshotDate,
            track_filter: filter,
            dimension,
            value,
            weighted_prevalence: wp,
            ad_count: filteredAds.filter(ad => {
              const tagVal = ad.tags[dimension] || ad.videoTags[dimension];
              return tagVal === value;
            }).length,
            total_signal_strength: totalSignal,
          });
        }
      }
    }
  }

  // Upsert snapshots
  if (snapshotsToSave.length > 0) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from('velocity_snapshots')
      .upsert(snapshotsToSave, {
        onConflict: 'brand_id,snapshot_date,track_filter,dimension,value',
      });
  }

  return {
    competitiveSet: `${brandName} Competitors`,
    brandId,
    analysisDate: snapshotDate,
    period: '90d',
    topAccelerating,
    topDeclining,
    fullDimensionBreakdown,
    trackDivergences,
  };
}

/**
 * Run velocity analysis for all active brands (weekly cron).
 */
export async function runVelocityPipeline(): Promise<VelocityPipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: VelocityPipelineStats = {
    brandsAnalyzed: 0,
    snapshotsSaved: 0,
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
      const result = await analyzeCreativeVelocity(brand.id);
      if (result) {
        stats.brandsAnalyzed++;
        // Count non-zero snapshots that were saved
        const snapshotCount = Object.values(result.fullDimensionBreakdown)
          .reduce((sum, dim) => sum + Object.keys(dim).length, 0);
        stats.snapshotsSaved += snapshotCount;
      }
    } catch (error) {
      console.error(`[VELOCITY] Error analyzing brand ${brand.id}:`, error);
      stats.failed++;
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
