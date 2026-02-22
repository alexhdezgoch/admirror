import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type CompetitorTrack = 'consolidator' | 'velocity_tester';

const NEW_ADS_THRESHOLD = 10;
const SURVIVAL_DAYS = 14;
const LOOKBACK_DAYS = 30;

// --- Signal Strength Constants ---
// Track A (Consolidator): weight based on duration + variations
const TRACK_A_DURATION_MAX_DAYS = 90; // ads running 90+ days get full duration credit
const TRACK_A_VARIATION_MAX = 5;      // 5+ variations gets full variation credit
const TRACK_A_DURATION_WEIGHT = 0.7;  // duration matters most for consolidators
const TRACK_A_VARIATION_WEIGHT = 0.3;

// Track B (Velocity Tester): weight based on survival context
const TRACK_B_BASELINE_SURVIVAL = 0.5; // 50% survival = neutral selectivity
const TRACK_B_MIN_SIGNAL = 10;         // floor for any surviving ad

export interface ClassificationResult {
  competitorId: string;
  competitorName: string;
  track: CompetitorTrack;
  previousTrack: CompetitorTrack | null;
  trackChanged: boolean;
  newAds30d: number;
  totalAdsLaunched30d: number;
  survived14d: number;
  survivalRate: number | null;
}

export interface ClassificationPipelineStats {
  total: number;
  classified: number;
  trackChanges: number;
  adsScored: number;
  failed: number;
  durationMs: number;
}

/**
 * Calculate signal_strength (0-100) for a Track A (Consolidator) ad.
 * Longer running + more variations = higher confidence signal.
 */
export function calculateTrackASignal(daysActive: number, variationCount: number): number {
  const durationScore = Math.min(daysActive / TRACK_A_DURATION_MAX_DAYS, 1);
  const variationScore = Math.min(variationCount / TRACK_A_VARIATION_MAX, 1);

  const raw = (durationScore * TRACK_A_DURATION_WEIGHT + variationScore * TRACK_A_VARIATION_WEIGHT) * 100;
  return Math.round(Math.max(1, Math.min(100, raw)));
}

/**
 * Calculate signal_strength (0-100) for a Track B (Velocity Tester) ad.
 * An ad surviving when most siblings died = HIGH signal.
 * An ad surviving when most siblings also survived = LOWER signal.
 *
 * survivedAd: true if this ad survived past 14 days
 * survivalRate: the competitor's overall survival rate (0-1)
 */
export function calculateTrackBSignal(survivedAd: boolean, survivalRate: number, daysActive: number): number {
  if (!survivedAd) {
    // Killed ads get a low but non-zero score — they contribute negatively
    return Math.round(Math.max(1, Math.min(15, daysActive)));
  }

  // Selectivity: how rare is survival? Lower survival rate = more selective filter = higher signal
  // At 10% survival (0.1), selectivity = 0.9 → very high signal
  // At 80% survival (0.8), selectivity = 0.2 → low signal
  const selectivity = 1 - survivalRate;

  // Scale selectivity relative to a baseline
  // Below baseline survival = amplify signal. Above baseline = dampen.
  const selectivityMultiplier = selectivity / (1 - TRACK_B_BASELINE_SURVIVAL);

  const raw = Math.min(selectivityMultiplier, 1) * 100;
  return Math.round(Math.max(TRACK_B_MIN_SIGNAL, Math.min(100, raw)));
}

/**
 * Classify a single competitor based on their ad launch volume.
 */
export function classifyCompetitor(
  newAds30d: number,
  previousTrack: CompetitorTrack | null
): { track: CompetitorTrack; trackChanged: boolean } {
  const track: CompetitorTrack = newAds30d >= NEW_ADS_THRESHOLD ? 'velocity_tester' : 'consolidator';
  const trackChanged = previousTrack !== null && previousTrack !== track;
  return { track, trackChanged };
}

/**
 * Run the full classification pipeline for all competitors.
 */
export async function runClassificationPipeline(): Promise<ClassificationPipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: ClassificationPipelineStats = {
    total: 0,
    classified: 0,
    trackChanges: 0,
    adsScored: 0,
    failed: 0,
    durationMs: 0,
  };

  // 1. Fetch all competitors
  const { data: competitors, error: compError } = await supabase
    .from('competitors')
    .select('id, name, track');

  if (compError || !competitors || competitors.length === 0) {
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  stats.total = competitors.length;

  const thirtyDaysAgo = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const fourteenDaysAgo = new Date(Date.now() - SURVIVAL_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const now = new Date().toISOString();

  // 2. Fetch all ads launched in the last 30 days (for all competitors at once)
  const { data: recentAds } = await supabase
    .from('ads')
    .select('id, competitor_id, launch_date, days_active, variation_count, is_active')
    .gte('launch_date', thirtyDaysAgo);

  // Group ads by competitor
  const adsByCompetitor = new Map<string, typeof recentAds>();
  for (const ad of recentAds || []) {
    const existing = adsByCompetitor.get(ad.competitor_id) || [];
    existing.push(ad);
    adsByCompetitor.set(ad.competitor_id, existing);
  }

  // 3. Classify each competitor
  const results: ClassificationResult[] = [];

  for (const competitor of competitors) {
    try {
      const competitorAds = adsByCompetitor.get(competitor.id) || [];
      const newAds30d = competitorAds.length;
      const previousTrack = (competitor.track as CompetitorTrack) || null;

      const { track, trackChanged } = classifyCompetitor(newAds30d, previousTrack);

      // Calculate survival stats for Track B
      let survived14d = 0;
      let survivalRate: number | null = null;

      if (track === 'velocity_tester' && newAds30d > 0) {
        // Ads launched before the 14-day cutoff that are still active
        const eligibleForSurvival = competitorAds.filter(ad => ad.launch_date <= fourteenDaysAgo);
        survived14d = eligibleForSurvival.filter(ad => ad.is_active || ad.days_active >= SURVIVAL_DAYS).length;
        const eligibleCount = eligibleForSurvival.length;
        survivalRate = eligibleCount > 0 ? survived14d / eligibleCount : null;
      }

      // Update competitor record
      await supabase
        .from('competitors')
        .update({
          track,
          track_classified_at: now,
          new_ads_30d: newAds30d,
          total_ads_launched_30d: newAds30d,
          survived_14d: survived14d,
          survival_rate: survivalRate,
        })
        .eq('id', competitor.id);

      // Log track change if applicable
      if (trackChanged) {
        await supabase.from('track_change_log').insert({
          competitor_id: competitor.id,
          previous_track: previousTrack,
          new_track: track,
          new_ads_30d: newAds30d,
          survival_rate: survivalRate,
        });
        stats.trackChanges++;
      }

      results.push({
        competitorId: competitor.id,
        competitorName: competitor.name,
        track,
        previousTrack,
        trackChanged,
        newAds30d,
        totalAdsLaunched30d: newAds30d,
        survived14d,
        survivalRate,
      });

      stats.classified++;
    } catch (error) {
      console.error(`[CLASSIFY] Error classifying competitor ${competitor.name}:`, error);
      stats.failed++;
    }
  }

  // 4. Score all ads with signal_strength
  // Fetch ALL ads (not just recent) to score based on their competitor's current track
  const { data: allAds } = await supabase
    .from('ads')
    .select('id, competitor_id, days_active, variation_count, is_active, launch_date');

  if (allAds && allAds.length > 0) {
    // Build competitor lookup
    const competitorTrackMap = new Map<string, { track: CompetitorTrack; survivalRate: number | null }>();
    for (const result of results) {
      competitorTrackMap.set(result.competitorId, {
        track: result.track,
        survivalRate: result.survivalRate,
      });
    }

    // Score ads in batches
    const BATCH_SIZE = 100;
    const updates: Array<{ id: string; signal_strength: number; competitor_track: CompetitorTrack }> = [];

    for (const ad of allAds) {
      const comp = competitorTrackMap.get(ad.competitor_id);
      if (!comp) continue;

      let signalStrength: number;

      if (comp.track === 'consolidator') {
        signalStrength = calculateTrackASignal(ad.days_active, ad.variation_count);
      } else {
        const survived = ad.is_active || ad.days_active >= SURVIVAL_DAYS;
        const rate = comp.survivalRate ?? TRACK_B_BASELINE_SURVIVAL;
        signalStrength = calculateTrackBSignal(survived, rate, ad.days_active);
      }

      updates.push({
        id: ad.id,
        signal_strength: signalStrength,
        competitor_track: comp.track,
      });
    }

    // Batch update
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      // Use individual updates since Supabase doesn't support batch UPDATE with different values
      await Promise.all(
        batch.map(u =>
          supabase
            .from('ads')
            .update({ signal_strength: u.signal_strength, competitor_track: u.competitor_track })
            .eq('id', u.id)
        )
      );
    }

    stats.adsScored = updates.length;
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
