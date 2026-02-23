import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';
import { fetchTaggedAds, calculateWeightedPrevalence, type TaggedAd } from './creative-velocity';

const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

// --- Interfaces ---

export interface GapElement {
  dimension: string;
  value: string;
  clientPrevalence: number;
  competitorPrevalence: number;
  gapSize: number;
  velocity: number;
  velocityDirection: 'accelerating' | 'declining' | 'stable';
  convergenceScore: number;
  convergenceClassification: string;
  priorityScore: number;
  competitorExamples: { adId: string; competitorName: string }[];
  recommendation: string;
}

export interface GapAnalysis {
  brandId: string;
  analysisDate: string;
  totalClientAds: number;
  totalCompetitorAds: number;
  priorityGaps: GapElement[];
  strengths: GapElement[];
  watchList: GapElement[];
  summary: {
    biggestOpportunity: string;
    strongestMatch: string;
    totalGapsIdentified: number;
  };
}

export interface GapPipelineStats {
  brandsAnalyzed: number;
  snapshotsSaved: number;
  clientAdsSynced: number;
  failed: number;
  durationMs: number;
}

// --- Exported Functions ---

export async function syncClientAdsForTagging(brandId: string): Promise<{ synced: number; alreadySynced: number }> {
  const supabase = getSupabaseAdmin();

  const { data: brand } = await supabase
    .from('client_brands')
    .select('id, name, user_id')
    .eq('id', brandId)
    .single();

  if (!brand) return { synced: 0, alreadySynced: 0 };

  const { data: clientAds } = await supabase
    .from('client_ads')
    .select('meta_ad_id, thumbnail_url, image_url, created_at')
    .eq('client_brand_id', brandId)
    .eq('effective_status', 'ACTIVE');

  if (!clientAds || clientAds.length === 0) return { synced: 0, alreadySynced: 0 };

  const adIds = clientAds.map(ca => `client-${ca.meta_ad_id}`);

  const { data: existingAds } = await supabase
    .from('ads')
    .select('id')
    .in('id', adIds);

  const existingIds = new Set((existingAds || []).map(a => a.id));

  let synced = 0;
  let alreadySynced = existingIds.size;

  const toInsert = clientAds
    .filter(ca => !existingIds.has(`client-${ca.meta_ad_id}`))
    .map(ca => {
      const createdAt = ca.created_at || new Date().toISOString();
      const daysActive = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000)));
      return {
        id: `client-${ca.meta_ad_id}`,
        user_id: brand.user_id,
        client_brand_id: brandId,
        competitor_id: null,
        competitor_name: null,
        competitor_logo: '',
        is_client_ad: true,
        thumbnail_url: ca.thumbnail_url || ca.image_url || null,
        tagging_status: 'pending',
        format: 'image',
        is_video: false,
        launch_date: createdAt.split('T')[0],
        days_active: daysActive,
        last_seen_at: new Date().toISOString(),
      };
    });

  if (toInsert.length > 0) {
    const { error: bulkError } = await supabase.from('ads').insert(toInsert);
    if (bulkError) {
      console.error(`[CLIENT-SYNC] Bulk insert failed for brand ${brandId}, falling back to individual inserts:`, bulkError.message);
      for (const ad of toInsert) {
        const { error: singleError } = await supabase.from('ads').insert(ad);
        if (singleError) {
          console.error(`[CLIENT-SYNC] Skipping client ad ${ad.id}: ${singleError.message}`);
        } else {
          synced++;
        }
      }
    } else {
      synced = toInsert.length;
    }
  }

  return { synced, alreadySynced };
}

export async function fetchClientTaggedAds(brandId: string): Promise<TaggedAd[]> {
  const supabase = getSupabaseAdmin();

  const { data: ads } = await supabase
    .from('ads')
    .select('id, is_video')
    .eq('client_brand_id', brandId)
    .eq('is_client_ad', true)
    .eq('tagging_status', 'tagged');

  if (!ads || ads.length === 0) return [];

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
  return ads
    .filter(ad => tagsByAdId.has(ad.id))
    .map(ad => ({
      id: ad.id,
      competitor_id: '',
      signal_strength: 1,
      competitor_track: null,
      launch_date: new Date().toISOString().split('T')[0],
      is_video: ad.is_video,
      tags: tagsByAdId.get(ad.id) || emptyTags,
      videoTags: videoTagsByAdId.get(ad.id) || emptyTags,
    }));
}

export function calculatePriorityScore(gapSize: number, velocity: number, convergenceScore: number): number {
  return Math.abs(gapSize) * (1 + Math.abs(velocity)) * (1 + convergenceScore);
}

export function generateRecommendation(element: GapElement): string {
  const pctGap = Math.round(Math.abs(element.gapSize) * 100);
  const dim = element.dimension.replace(/_/g, ' ');
  const val = element.value.replace(/_/g, ' ');

  if (element.gapSize <= 0) {
    return `Strength: Your use of ${val} (${dim}) exceeds competitors by ${pctGap}%.`;
  }

  if (element.velocityDirection === 'accelerating' && element.convergenceScore > 0) {
    return `Critical opportunity: Competitors are converging on ${val} (${dim}) — you're ${pctGap}% behind and the trend is accelerating.`;
  }

  if (element.velocityDirection === 'accelerating') {
    return `High priority: ${val} (${dim}) is gaining traction among competitors. Consider testing this approach.`;
  }

  if (element.velocityDirection === 'stable') {
    return `Opportunity: Competitors use ${val} (${dim}) more than you. Worth testing.`;
  }

  // declining
  return `Low priority: ${val} (${dim}) shows a gap but is declining in popularity.`;
}

export async function analyzeCreativeGap(brandId: string): Promise<GapAnalysis | null> {
  const supabase = getSupabaseAdmin();

  // 1. Sync client ads into the tagging pipeline
  await syncClientAdsForTagging(brandId);

  // 2. Fetch tagged client ads
  const clientAds = await fetchClientTaggedAds(brandId);
  if (clientAds.length === 0) return null;

  // 3. Fetch competitor ads
  const fetchResult = await fetchTaggedAds(brandId, 90);
  if (!fetchResult || fetchResult.taggedAds.length === 0) return null;

  const { competitors, taggedAds: competitorAds } = fetchResult;

  // 4. Calculate weighted prevalence for both sets
  const clientPrevalence = calculateWeightedPrevalence(clientAds, 'all');
  const competitorPrevalence = calculateWeightedPrevalence(competitorAds, 'all');

  // 5. Load velocity snapshots (most recent, track_filter='all')
  const snapshotDate = new Date().toISOString().split('T')[0];
  const { data: velocitySnaps } = await supabase
    .from('velocity_snapshots')
    .select('dimension, value, weighted_prevalence')
    .eq('brand_id', brandId)
    .eq('track_filter', 'all')
    .order('snapshot_date', { ascending: false })
    .limit(500);

  const velocityMap = new Map<string, number>();
  for (const snap of velocitySnaps || []) {
    const key = `${snap.dimension}:${snap.value}`;
    if (!velocityMap.has(key)) {
      velocityMap.set(key, snap.weighted_prevalence);
    }
  }

  // 6. Load convergence snapshots (most recent)
  const { data: convergenceSnaps } = await supabase
    .from('convergence_snapshots')
    .select('dimension, value, adjusted_score, classification')
    .eq('brand_id', brandId)
    .order('snapshot_date', { ascending: false })
    .limit(500);

  const convergenceMap = new Map<string, { score: number; classification: string }>();
  for (const snap of convergenceSnaps || []) {
    const key = `${snap.dimension}:${snap.value}`;
    if (!convergenceMap.has(key)) {
      convergenceMap.set(key, {
        score: Number(snap.adjusted_score) || 0,
        classification: snap.classification || 'NO_CONVERGENCE',
      });
    }
  }

  // Build a competitor lookup for example ads
  const competitorNameMap = new Map<string, string>();
  for (const comp of competitors) {
    competitorNameMap.set(comp.id, comp.name);
  }

  // 7. Build gap elements for every dimension/value
  const allElements: GapElement[] = [];

  for (const [dimension, values] of Object.entries(ALL_DIMENSIONS)) {
    for (const value of values) {
      const clientPrev = clientPrevalence[dimension]?.[value] ?? 0;
      const compPrev = competitorPrevalence[dimension]?.[value] ?? 0;

      // Skip values nobody uses
      if (clientPrev < 0.001 && compPrev < 0.001) continue;

      const gapSize = compPrev - clientPrev;
      const key = `${dimension}:${value}`;

      const velocityVal = velocityMap.get(key) ?? 0;
      let velocityDirection: 'accelerating' | 'declining' | 'stable' = 'stable';
      if (velocityVal > 0.3) velocityDirection = 'accelerating';
      else if (velocityVal < -0.3) velocityDirection = 'declining';

      const conv = convergenceMap.get(key) ?? { score: 0, classification: 'NO_CONVERGENCE' };

      const priorityScore = calculatePriorityScore(gapSize, velocityVal, conv.score);

      // Find up to 3 competitor example ads
      const exampleAds = competitorAds
        .filter(ad => {
          const tagVal = ad.tags[dimension] || ad.videoTags[dimension];
          return tagVal === value;
        })
        .slice(0, 3)
        .map(ad => ({
          adId: ad.id,
          competitorName: competitorNameMap.get(ad.competitor_id) || 'Unknown',
        }));

      const element: GapElement = {
        dimension,
        value,
        clientPrevalence: Math.round(clientPrev * 10000) / 10000,
        competitorPrevalence: Math.round(compPrev * 10000) / 10000,
        gapSize: Math.round(gapSize * 10000) / 10000,
        velocity: Math.round(velocityVal * 10000) / 10000,
        velocityDirection,
        convergenceScore: conv.score,
        convergenceClassification: conv.classification,
        priorityScore: Math.round(priorityScore * 10000) / 10000,
        competitorExamples: exampleAds,
        recommendation: '',
      };
      element.recommendation = generateRecommendation(element);

      allElements.push(element);
    }
  }

  // 8. Categorize
  const positiveGaps = allElements
    .filter(e => e.gapSize > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const priorityGaps = positiveGaps.slice(0, 5);

  const strengths = allElements
    .filter(e => e.clientPrevalence >= e.competitorPrevalence && e.clientPrevalence > 0.01)
    .sort((a, b) => b.clientPrevalence - a.clientPrevalence);

  const watchList = allElements
    .filter(e => Math.abs(e.gapSize) < 0.1 && e.velocityDirection === 'accelerating')
    .sort((a, b) => b.velocity - a.velocity);

  // 9. Summary
  const totalGapsIdentified = positiveGaps.length;
  const biggestOpportunity = priorityGaps[0]
    ? `${priorityGaps[0].value} (${priorityGaps[0].dimension})`
    : 'None identified';
  const strongestMatch = strengths[0]
    ? `${strengths[0].value} (${strengths[0].dimension})`
    : 'None identified';

  const analysis: GapAnalysis = {
    brandId,
    analysisDate: snapshotDate,
    totalClientAds: clientAds.length,
    totalCompetitorAds: competitorAds.length,
    priorityGaps,
    strengths,
    watchList,
    summary: {
      biggestOpportunity,
      strongestMatch,
      totalGapsIdentified,
    },
  };

  // 10. Upsert snapshot
  await supabase
    .from('gap_analysis_snapshots')
    .upsert({
      brand_id: brandId,
      snapshot_date: snapshotDate,
      total_client_ads: clientAds.length,
      total_competitor_ads: competitorAds.length,
      analysis_json: analysis as unknown as Record<string, unknown>,
    }, {
      onConflict: 'brand_id,snapshot_date',
    });

  return analysis;
}

export async function runGapAnalysisPipeline(): Promise<GapPipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: GapPipelineStats = {
    brandsAnalyzed: 0,
    snapshotsSaved: 0,
    clientAdsSynced: 0,
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
      const result = await analyzeCreativeGap(brand.id);
      if (result) {
        stats.brandsAnalyzed++;
        stats.snapshotsSaved++;
      }
    } catch (error) {
      console.error(`[GAP-ANALYSIS] Error analyzing brand ${brand.id}:`, error);
      stats.failed++;
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
