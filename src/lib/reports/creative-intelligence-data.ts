import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { CreativeIntelligenceData } from '@/types/report';

export async function fetchCreativeIntelligenceData(
  brandId: string,
  hasMetaConnection: boolean
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
  ] = await Promise.all([
    // Current snapshot: all tracks
    admin
      .from('velocity_snapshots')
      .select('*')
      .eq('brand_id', brandId)
      .eq('snapshot_date', latestDate)
      .eq('track_filter', 'all')
      .order('weighted_prevalence', { ascending: false })
      .limit(20),

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

    // Gap analysis (only if Meta connected)
    hasMetaConnection
      ? admin
          .from('gap_analysis_snapshots')
          .select('*')
          .eq('brand_id', brandId)
          .order('snapshot_date', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),

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
  ]);

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

  const strongConvergences = currentConvergence
    .filter((r) =>
      r.classification === 'STRONG_CONVERGENCE' ||
      r.classification === 'MODERATE_CONVERGENCE'
    )
    .map((r) => ({
      dimension: r.dimension,
      value: r.value,
      convergenceRatio: r.convergence_ratio,
      crossTrack: r.cross_track ?? false,
      competitorsIncreasing: r.competitors_increasing ?? 0,
      totalCompetitors: r.total_competitors ?? 0,
    }));

  const newAlerts = currentConvergence
    .filter((r) => r.is_new_alert)
    .map((r) => ({
      dimension: r.dimension,
      value: r.value,
      convergenceRatio: r.convergence_ratio,
    }));

  // Process gap analysis
  let gaps: CreativeIntelligenceData['gaps'] = null;
  if (hasMetaConnection && gapResult.data && gapResult.data.length > 0) {
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
    }));

    const cashCows = lifecycleRow?.cash_cow_transitions || [];
    const winningPatterns = lifecycleRow?.winning_patterns || [];

    breakouts = { events, cashCows, winningPatterns };
  }

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
    breakouts,
  };
}
