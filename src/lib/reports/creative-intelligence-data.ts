import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { CreativeIntelligenceData } from '@/types/report';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';
import { Ad } from '@/types';
import { computeFallbackGaps, computeFallbackBreakouts, deriveClientPatternsFromGaps } from '@/lib/reports/fallback-analysis';

const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

export async function fetchCreativeIntelligenceData(
  brandId: string,
  _hasMetaConnection?: boolean
): Promise<CreativeIntelligenceData | null> {
  const admin = getSupabaseAdmin();

  // Fetch velocity data: two most recent snapshots to compute velocity
  const { data: currentSnapshot } = await admin
    .from('velocity_snapshots')
    .select('*')
    .eq('brand_id', brandId)
    .order('snapshot_date', { ascending: false })
    .limit(1);

  if (!currentSnapshot || currentSnapshot.length === 0) {
    return null;
  }

  const latestDate = currentSnapshot[0].snapshot_date;

  // Fetch all data in parallel
  const [
    allTrackResult,
    trackAResult,
    trackBResult,
    previousSnapshotResult,
    convergenceResult,
    gapResult,
    breakoutResult,
    lifecycleResult,
    clientAdsResult,
    taggedAdsCountResult,
    competitorCountResult,
  ] = await Promise.all([
    // Current snapshot: all tracks
    admin
      .from('velocity_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .eq('snapshot_date', latestDate)
      .eq('track_filter', 'all')
      .order('weighted_prevalence', { ascending: false })
      .limit(200),

    // Current snapshot: Track A (consolidators)
    admin
      .from('velocity_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .eq('snapshot_date', latestDate)
      .eq('track_filter', 'consolidator')
      .order('weighted_prevalence', { ascending: false })
      .limit(20),

    // Current snapshot: Track B (velocity testers)
    admin
      .from('velocity_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .eq('snapshot_date', latestDate)
      .eq('track_filter', 'velocity_tester')
      .order('weighted_prevalence', { ascending: false })
      .limit(20),

    // Previous snapshot for velocity calculation
    admin
      .from('velocity_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .eq('track_filter', 'all')
      .lt('snapshot_date', latestDate)
      .order('snapshot_date', { ascending: false })
      .limit(20),

    // Convergence data
    admin
      .from('convergence_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .order('snapshot_date', { ascending: false })
      .limit(50),

    // Gap analysis
    admin
      .from('gap_analysis_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .order('snapshot_date', { ascending: false })
      .limit(1),

    // Breakout events
    admin
      .from('breakout_events')
      .select('*')
      .eq('brand_id', brandId)
      .order('analysis_date', { ascending: false })
      .limit(10),

    // Lifecycle analysis
    admin
      .from('lifecycle_analysis_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .order('snapshot_date', { ascending: false })
      .limit(1),

    // Check for client ads (use is_client_ad flag — self-competitor ads have a competitor_id set)
    admin
      .from('ads')
      .select('id')
      .eq('client_brand_id', brandId)
      .eq('is_client_ad', true)
      .limit(1),

    // Total tagged competitor ads (all time, not just 30-day window)
    admin
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('client_brand_id', brandId)
      .not('competitor_id', 'is', null)
      .eq('tagging_status', 'tagged'),

    // Total competitors for this brand
    admin
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId),
  ]);

  const hasClientAds = (clientAdsResult.data?.length ?? 0) > 0;

  const allTrack = allTrackResult.data || [];
  const trackA = trackAResult.data || [];
  const trackB = trackBResult.data || [];
  const previousSnapshot = previousSnapshotResult.data || [];

  // Build previous prevalence lookup
  const prevMap = new Map<string, number>();
  for (const row of previousSnapshot) {
    prevMap.set(`${row.dimension}:${row.value}`, row.weighted_prevalence);
  }

  // Compute velocity for each current row
  const withVelocity = allTrack.map((row) => {
    const key = `${row.dimension}:${row.value}`;
    const prev = prevMap.get(key) ?? row.weighted_prevalence;
    const velocityPercent = prev > 0
      ? ((row.weighted_prevalence - prev) / prev) * 100
      : 0;
    return {
      dimension: row.dimension,
      value: row.value,
      velocityPercent: Math.round(velocityPercent * 10) / 10,
      currentPrevalence: row.weighted_prevalence,
      adCount: row.ad_count || 0,
    };
  });

  const topAccelerating = [...withVelocity]
    .filter((r) => r.velocityPercent > 0)
    .sort((a, b) => b.velocityPercent - a.velocityPercent)
    .slice(0, 10);

  const topDeclining = [...withVelocity]
    .filter((r) => r.velocityPercent < 0)
    .sort((a, b) => a.velocityPercent - b.velocityPercent)
    .slice(0, 10);

  // Compute track divergences
  const trackAMap = new Map<string, number>();
  for (const row of trackA) {
    trackAMap.set(`${row.dimension}:${row.value}`, row.weighted_prevalence);
  }

  const trackBMap = new Map<string, number>();
  for (const row of trackB) {
    trackBMap.set(`${row.dimension}:${row.value}`, row.weighted_prevalence);
  }

  const allKeys = Array.from(new Set([...Array.from(trackAMap.keys()), ...Array.from(trackBMap.keys())]));
  const divergences: CreativeIntelligenceData['velocity']['trackDivergences'] = [];

  for (const key of allKeys) {
    const aVal = trackAMap.get(key) ?? 0;
    const bVal = trackBMap.get(key) ?? 0;
    const divergence = Math.abs(aVal - bVal);
    if (divergence > 10) {
      const [dimension, value] = key.split(':');
      divergences.push({
        dimension,
        value,
        trackAPrevalence: aVal,
        trackBPrevalence: bVal,
        divergencePercent: Math.round(divergence * 10) / 10,
      });
    }
  }

  divergences.sort((a, b) => b.divergencePercent - a.divergencePercent);

  // Process convergence data
  const convergenceRows = convergenceResult.data || [];
  const latestConvergenceDate = convergenceRows[0]?.snapshot_date;

  const currentConvergence = latestConvergenceDate
    ? convergenceRows.filter((r) => r.snapshot_date === latestConvergenceDate)
    : [];

  const ABSENCE_VALUES = new Set([
    'none', 'no_human', 'not_visible', 'no_brand_elements',
    'neither', 'none_no_speech', 'silent', 'no_script_music_only',
  ]);

  const strongConvergences = currentConvergence
    .filter((r) =>
      (r.classification === 'STRONG_CONVERGENCE' ||
      r.classification === 'MODERATE_CONVERGENCE') &&
      r.convergence_ratio >= 0.8 &&
      !ABSENCE_VALUES.has(r.value)
    )
    .map((r) => ({
      dimension: r.dimension,
      value: r.value,
      convergenceRatio: r.convergence_ratio,
      crossTrack: r.cross_track ?? false,
      competitorsIncreasing: r.competitors_increasing ?? 0,
      totalCompetitors: r.total_competitors ?? 0,
    }))
    .sort((a, b) => b.convergenceRatio - a.convergenceRatio);

  const newAlerts = currentConvergence
    .filter((r) =>
      r.is_new_alert &&
      r.convergence_ratio >= 0.8 &&
      !ABSENCE_VALUES.has(r.value)
    )
    .map((r) => ({
      dimension: r.dimension,
      value: r.value,
      convergenceRatio: r.convergence_ratio,
    }));

  // Process gap analysis
  let gaps: CreativeIntelligenceData['gaps'] = null;
  if (hasClientAds && gapResult.data && gapResult.data.length > 0) {
    const gapRow = gapResult.data[0];
    const analysisJson = gapRow.analysis_json;
    if (analysisJson) {
      gaps = {
        priorityGaps: (analysisJson.priorityGaps || []).slice(0, 5),
        strengths: (analysisJson.strengths || []).slice(0, 3),
        summary: analysisJson.summary || {
          biggestOpportunity: 'No data',
          strongestMatch: 'No data',
          totalGapsIdentified: 0,
        },
      };
    }
  }

  // Compute clientPatterns from gap data
  let clientPatterns: CreativeIntelligenceData['clientPatterns'] = null;
  if (gaps) {
    const map = new Map<string, { dimension: string; value: string; prevalence: number }>();
    for (const g of gaps.priorityGaps) {
      map.set(`${g.dimension}:${g.value}`, { dimension: g.dimension, value: g.value, prevalence: g.clientPrevalence });
    }
    for (const s of gaps.strengths) {
      const key = `${s.dimension}:${s.value}`;
      if (!map.has(key)) map.set(key, { dimension: s.dimension, value: s.value, prevalence: s.clientPrevalence });
    }
    clientPatterns = Array.from(map.values());
  }

  // Process breakout events
  let breakouts: CreativeIntelligenceData['breakouts'] = null;
  const breakoutRows = breakoutResult.data || [];
  const lifecycleRow = lifecycleResult.data?.[0];

  if (breakoutRows.length > 0 || lifecycleRow) {
    const events = breakoutRows.slice(0, 3).map((row) => ({
      competitorName: row.competitor_name,
      cohortStart: row.cohort_start,
      cohortEnd: row.cohort_end,
      totalInCohort: row.total_in_cohort,
      survivorsCount: row.survivors_count,
      survivalRate: row.survival_rate,
      topSurvivorTraits: row.top_survivor_traits || [],
      analysisSummary: row.analysis_summary ?? null,
      survivorAdIds: row.survivor_ad_ids || [],
    }));

    const cashCows = lifecycleRow?.cash_cow_transitions || [];
    const winningPatterns = lifecycleRow?.winning_patterns || [];

    breakouts = { events, cashCows, winningPatterns };
  }

  const rawPrevalence = allTrack.map((row) => ({
    dimension: row.dimension,
    value: row.value,
    weightedPrevalence: row.weighted_prevalence,
    adCount: row.ad_count || 0,
  }));

  const uniqueDimensions = new Set(allTrack.map((r) => r.dimension));
  const totalTaggedAds = taggedAdsCountResult.count ?? 0;
  const gapRow = gapResult.data?.[0];

  const metadata: CreativeIntelligenceData['metadata'] = {
    totalTaggedAds,
    competitorCount: competitorCountResult.count ?? currentConvergence[0]?.total_competitors ?? 0,
    snapshotCount: previousSnapshot.length > 0 ? 2 : 1,
    dimensionCount: uniqueDimensions.size,
    totalClientAds: gapRow?.total_client_ads ?? 0,
    totalCompetitorAds: gapRow?.total_competitor_ads ?? 0,
  };

  return {
    velocity: {
      topAccelerating,
      topDeclining,
      trackDivergences: divergences.slice(0, 10),
    },
    convergence: {
      strongConvergences,
      newAlerts,
    },
    gaps,
    rawPrevalence,
    breakouts,
    clientPatterns,
    metadata,
  };
}

// ---------------------------------------------------------------------------
// Synthetic CI: build CreativeIntelligenceData from raw ads when no snapshots
// ---------------------------------------------------------------------------

const PROVEN_DAYS = 45;

export async function buildSyntheticCI(
  brandId: string,
  allAds: Ad[],
  clientAds: Ad[],
  competitorAds: Ad[],
): Promise<CreativeIntelligenceData> {
  const admin = getSupabaseAdmin();

  // Get IDs for tagged competitor ads
  const competitorAdIds = competitorAds.map(a => a.id);

  // Fetch creative_tags + video_tags for competitor ads
  const [creativeTagsResult, videoTagsResult] = await Promise.all([
    competitorAdIds.length > 0
      ? admin
          .from('creative_tags')
          .select('ad_id, format_type, hook_type_visual, human_presence, text_overlay_density, text_overlay_position, color_temperature, background_style, product_visibility, cta_visual_style, visual_composition, brand_element_presence, emotion_energy_level')
          .in('ad_id', competitorAdIds)
      : Promise.resolve({ data: [] }),
    competitorAdIds.length > 0
      ? admin
          .from('video_tags')
          .select('ad_id, script_structure, verbal_hook_type, pacing, audio_style, video_duration_bucket, narrative_arc, opening_frame')
          .in('ad_id', competitorAdIds)
      : Promise.resolve({ data: [] }),
  ]);

  const creativeTags = creativeTagsResult.data || [];
  const videoTags = videoTagsResult.data || [];

  // Build a set of ad IDs that have tags (= "tagged")
  const taggedAdIds = new Set<string>();
  for (const t of creativeTags) taggedAdIds.add(t.ad_id);
  for (const t of videoTags) taggedAdIds.add(t.ad_id);

  // Build tagged competitor ad list with daysActive for longevity analysis
  const daysActiveMap = new Map<string, number>();
  for (const ad of competitorAds) {
    daysActiveMap.set(ad.id, ad.daysActive);
  }

  // Compute rawPrevalence: count dimension/value across all tagged competitor ads
  const dimValueCounts: Record<string, Record<string, number>> = {};
  const dimTotals: Record<string, number> = {};

  for (const dimension of Object.keys(ALL_DIMENSIONS)) {
    dimValueCounts[dimension] = {};
    dimTotals[dimension] = 0;
  }

  for (const tag of creativeTags) {
    for (const dimension of Object.keys(TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        dimValueCounts[dimension][value] = (dimValueCounts[dimension][value] || 0) + 1;
        dimTotals[dimension]++;
      }
    }
  }

  for (const tag of videoTags) {
    for (const dimension of Object.keys(VIDEO_TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        dimValueCounts[dimension][value] = (dimValueCounts[dimension][value] || 0) + 1;
        dimTotals[dimension]++;
      }
    }
  }

  // Normalize to 0-1 prevalence
  const rawPrevalence: NonNullable<CreativeIntelligenceData['rawPrevalence']> = [];
  for (const [dim, values] of Object.entries(dimValueCounts)) {
    const total = dimTotals[dim];
    if (total === 0) continue;
    for (const [val, count] of Object.entries(values)) {
      rawPrevalence.push({
        dimension: dim,
        value: val,
        weightedPrevalence: Math.round((count / total) * 1000) / 1000,
        adCount: count,
      });
    }
  }

  rawPrevalence.sort((a, b) => b.weightedPrevalence - a.weightedPrevalence);

  // Velocity from longevity: compare proven ads (45+ days) vs all tagged ads
  const provenAdIds = new Set<string>();
  Array.from(taggedAdIds).forEach(adId => {
    if ((daysActiveMap.get(adId) || 0) >= PROVEN_DAYS) {
      provenAdIds.add(adId);
    }
  });

  // Compute prevalence for proven ads
  const provenDimValueCounts: Record<string, Record<string, number>> = {};
  const provenDimTotals: Record<string, number> = {};

  for (const dimension of Object.keys(ALL_DIMENSIONS)) {
    provenDimValueCounts[dimension] = {};
    provenDimTotals[dimension] = 0;
  }

  for (const tag of creativeTags) {
    if (!provenAdIds.has(tag.ad_id)) continue;
    for (const dimension of Object.keys(TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        provenDimValueCounts[dimension][value] = (provenDimValueCounts[dimension][value] || 0) + 1;
        provenDimTotals[dimension]++;
      }
    }
  }

  for (const tag of videoTags) {
    if (!provenAdIds.has(tag.ad_id)) continue;
    for (const dimension of Object.keys(VIDEO_TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        provenDimValueCounts[dimension][value] = (provenDimValueCounts[dimension][value] || 0) + 1;
        provenDimTotals[dimension]++;
      }
    }
  }

  // Compute lift: proven prevalence vs all prevalence
  const withVelocity: Array<{
    dimension: string;
    value: string;
    velocityPercent: number;
    currentPrevalence: number;
    adCount: number;
  }> = [];

  for (const row of rawPrevalence) {
    const allPrev = row.weightedPrevalence;
    const provenTotal = provenDimTotals[row.dimension] || 0;
    const provenCount = provenDimValueCounts[row.dimension]?.[row.value] || 0;
    const provenPrev = provenTotal > 0 ? provenCount / provenTotal : 0;

    // Velocity = lift of proven over all (percentage change)
    const velocityPercent = allPrev > 0
      ? Math.round(((provenPrev - allPrev) / allPrev) * 1000) / 10
      : 0;

    withVelocity.push({
      dimension: row.dimension,
      value: row.value,
      velocityPercent,
      currentPrevalence: row.weightedPrevalence,
      adCount: row.adCount,
    });
  }

  const topAccelerating = [...withVelocity]
    .filter(r => r.velocityPercent > 0)
    .sort((a, b) => b.velocityPercent - a.velocityPercent)
    .slice(0, 10);

  const topDeclining = [...withVelocity]
    .filter(r => r.velocityPercent < 0)
    .sort((a, b) => a.velocityPercent - b.velocityPercent)
    .slice(0, 10);

  // Gaps: delegate to existing fallback if client ads exist
  let gaps: CreativeIntelligenceData['gaps'] = null;
  let clientPatterns: CreativeIntelligenceData['clientPatterns'] = null;

  if (clientAds.length > 0 && rawPrevalence.length > 0) {
    try {
      gaps = await computeFallbackGaps(brandId, clientAds.map(a => a.id), rawPrevalence);
      if (gaps) {
        clientPatterns = deriveClientPatternsFromGaps(gaps);
      }
    } catch (err) {
      console.error('[SyntheticCI] Fallback gap analysis failed:', err);
    }
  }

  // Breakouts: delegate to existing fallback if enough competitor ads
  let breakouts: CreativeIntelligenceData['breakouts'] = null;
  if (competitorAds.length >= 10) {
    breakouts = computeFallbackBreakouts(competitorAds);
  }

  const uniqueDimensions = new Set(rawPrevalence.map(r => r.dimension));
  const competitorCount = new Set(competitorAds.map(a => a.competitorId)).size;

  return {
    velocity: {
      topAccelerating,
      topDeclining,
      trackDivergences: [],
    },
    convergence: {
      strongConvergences: [],
      newAlerts: [],
    },
    gaps,
    rawPrevalence,
    breakouts,
    clientPatterns,
    metadata: {
      totalTaggedAds: taggedAdIds.size,
      competitorCount,
      snapshotCount: 0,
      dimensionCount: uniqueDimensions.size,
      totalClientAds: clientAds.length,
      totalCompetitorAds: competitorAds.length,
    },
  };
}
