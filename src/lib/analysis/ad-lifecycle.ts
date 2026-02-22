import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';

const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

// --- Constants ---

export const COHORT_WINDOW_DAYS = 7;
export const BREAKOUT_THRESHOLD_DAYS = 14;
export const CASH_COW_THRESHOLD_DAYS = 60;
export const BREAKOUT_SURVIVAL_RATE_THRESHOLD = 0.30;
export const MIN_COHORT_SIZE = 3;
export const LOOKBACK_DAYS = 90;

// --- Interfaces ---

export interface LifecycleAd {
  id: string;
  competitor_id: string;
  competitor_name: string;
  launch_date: string;
  days_active: number;
  is_active: boolean;
  is_video: boolean;
  cohort_week: string | null;
  is_breakout: boolean;
  is_cash_cow: boolean;
  tags: Record<string, string | null>;
  videoTags: Record<string, string | null>;
}

export interface Cohort {
  competitorId: string;
  competitorName: string;
  cohortStart: string;
  cohortEnd: string;
  ads: LifecycleAd[];
  survivors: LifecycleAd[];
  killed: LifecycleAd[];
  survivalRate: number;
  isBreakoutCohort: boolean;
}

export interface DifferentiatingElement {
  dimension: string;
  value: string;
  survivorPrevalence: number;
  killedPrevalence: number;
  lift: number;
  direction: 'survivor_higher' | 'killed_higher';
}

export interface BreakoutEvent {
  brandId: string;
  competitorId: string;
  competitorName: string;
  cohortStart: string;
  cohortEnd: string;
  analysisDate: string;
  totalInCohort: number;
  survivorsCount: number;
  killedCount: number;
  survivalRate: number;
  survivorAdIds: string[];
  killedAdIds: string[];
  survivorTagProfile: Record<string, Record<string, number>>;
  killedTagProfile: Record<string, Record<string, number>>;
  differentiatingElements: DifferentiatingElement[];
  topSurvivorTraits: string[];
  analysisSummary: string;
}

export interface CashCowTransition {
  adId: string;
  competitorName: string;
  daysActive: number;
  breakoutDate: string;
  cashCowDate: string;
  traits: string[];
}

export interface WinningPattern {
  dimension: string;
  value: string;
  frequency: number;
  avgLift: number;
  confidence: number;
}

export interface LifecycleAnalysis {
  brandId: string;
  analysisDate: string;
  breakoutEvents: BreakoutEvent[];
  cashCowTransitions: CashCowTransition[];
  winningPatterns: WinningPattern[];
  totalBreakoutAds: number;
  totalCashCows: number;
  marketSignals: string;
}

export interface LifecyclePipelineStats {
  brandsAnalyzed: number;
  breakoutEventsFound: number;
  breakoutAdsFlagged: number;
  cashCowsDetected: number;
  snapshotsSaved: number;
  failed: number;
  durationMs: number;
}

// --- Helper Functions ---

export function getCohortWeek(launchDate: string): string {
  const date = new Date(launchDate + 'T00:00:00Z');
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

export function getCohortEndDate(cohortStart: string): string {
  const monday = new Date(cohortStart + 'T00:00:00Z');
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return sunday.toISOString().split('T')[0];
}

export function isCohortReadyForBreakoutAnalysis(cohortEndDate: string): boolean {
  const endDate = new Date(cohortEndDate + 'T00:00:00Z');
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - endDate.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= BREAKOUT_THRESHOLD_DAYS;
}

export function isSurvivor(ad: LifecycleAd): boolean {
  return ad.is_active && ad.days_active >= BREAKOUT_THRESHOLD_DAYS;
}

export function isCashCow(ad: LifecycleAd): boolean {
  return ad.is_active && ad.days_active >= CASH_COW_THRESHOLD_DAYS;
}

export function calculateTagProfile(ads: LifecycleAd[]): Record<string, Record<string, number>> {
  if (ads.length === 0) return {};

  const profile: Record<string, Record<string, number>> = {};

  for (const [dimension, values] of Object.entries(ALL_DIMENSIONS)) {
    profile[dimension] = {};
    for (const value of values) {
      profile[dimension][value] = 0;
    }
  }

  for (const ad of ads) {
    for (const dimension of Object.keys(TAXONOMY_DIMENSIONS)) {
      const value = ad.tags[dimension];
      if (value && profile[dimension]?.[value] !== undefined) {
        profile[dimension][value]++;
      }
    }

    if (ad.is_video) {
      for (const dimension of Object.keys(VIDEO_TAXONOMY_DIMENSIONS)) {
        const value = ad.videoTags[dimension];
        if (value && profile[dimension]?.[value] !== undefined) {
          profile[dimension][value]++;
        }
      }
    }
  }

  // Normalize to 0-1 prevalence
  for (const dimension of Object.keys(profile)) {
    const dimTotal = Object.values(profile[dimension]).reduce((sum, v) => sum + v, 0);
    if (dimTotal > 0) {
      for (const value of Object.keys(profile[dimension])) {
        profile[dimension][value] = Math.round((profile[dimension][value] / dimTotal) * 10000) / 10000;
      }
    }
  }

  return profile;
}

export function findDifferentiatingElements(
  survivorProfile: Record<string, Record<string, number>>,
  killedProfile: Record<string, Record<string, number>>
): DifferentiatingElement[] {
  const elements: DifferentiatingElement[] = [];

  for (const [dimension, values] of Object.entries(survivorProfile)) {
    for (const [value, survivorPrevalence] of Object.entries(values)) {
      const killedPrevalence = killedProfile[dimension]?.[value] ?? 0;

      if (survivorPrevalence < 0.01 && killedPrevalence < 0.01) continue;

      let lift: number;
      let direction: 'survivor_higher' | 'killed_higher';

      if (survivorPrevalence >= killedPrevalence) {
        lift = killedPrevalence > 0.01
          ? survivorPrevalence / killedPrevalence
          : survivorPrevalence > 0.01 ? 10 : 1;
        direction = 'survivor_higher';
      } else {
        lift = survivorPrevalence > 0.01
          ? killedPrevalence / survivorPrevalence
          : killedPrevalence > 0.01 ? 10 : 1;
        direction = 'killed_higher';
      }

      if (lift >= 1.5) {
        elements.push({
          dimension,
          value,
          survivorPrevalence: Math.round(survivorPrevalence * 10000) / 10000,
          killedPrevalence: Math.round(killedPrevalence * 10000) / 10000,
          lift: Math.round(lift * 100) / 100,
          direction,
        });
      }
    }
  }

  elements.sort((a, b) => b.lift - a.lift);
  return elements;
}

export function generateBreakoutSummary(event: BreakoutEvent): string {
  const survPct = Math.round(event.survivalRate * 100);
  const topTraits = event.topSurvivorTraits.slice(0, 3).join(', ');
  const traitNote = topTraits ? ` Survivor traits: ${topTraits}.` : '';
  return `${event.competitorName} cohort (${event.cohortStart}): ${event.survivorsCount}/${event.totalInCohort} survived (${survPct}%).${traitNote}`;
}

export function aggregateWinningPatterns(breakoutEvents: BreakoutEvent[]): WinningPattern[] {
  if (breakoutEvents.length === 0) return [];

  const patternMap = new Map<string, { lifts: number[]; count: number }>();

  for (const event of breakoutEvents) {
    for (const elem of event.differentiatingElements) {
      if (elem.direction !== 'survivor_higher') continue;
      const key = `${elem.dimension}:${elem.value}`;
      const existing = patternMap.get(key) || { lifts: [], count: 0 };
      existing.lifts.push(elem.lift);
      existing.count++;
      patternMap.set(key, existing);
    }
  }

  const patterns: WinningPattern[] = [];
  for (const [key, data] of Array.from(patternMap.entries())) {
    const [dimension, value] = key.split(':');
    const avgLift = data.lifts.reduce((s: number, l: number) => s + l, 0) / data.lifts.length;
    const confidence = Math.min(1.0, Math.sqrt(data.count / breakoutEvents.length));

    patterns.push({
      dimension,
      value,
      frequency: data.count,
      avgLift: Math.round(avgLift * 100) / 100,
      confidence: Math.round(confidence * 10000) / 10000,
    });
  }

  patterns.sort((a, b) => (b.confidence * b.avgLift) - (a.confidence * a.avgLift));
  return patterns.slice(0, 20);
}

// --- Data Fetching ---

export async function fetchLifecycleAds(
  brandId: string,
  lookbackDays: number
): Promise<{ velocityTesters: { id: string; name: string }[]; ads: LifecycleAd[] } | null> {
  const supabase = getSupabaseAdmin();

  const { data: brand } = await supabase
    .from('client_brands')
    .select('id, name')
    .eq('id', brandId)
    .single();

  if (!brand) return null;

  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name')
    .eq('brand_id', brandId)
    .eq('track', 'velocity_tester');

  if (!competitors || competitors.length === 0) return null;

  const competitorIds = competitors.map(c => c.id);
  const competitorNameMap = new Map(competitors.map(c => [c.id, c.name]));
  const cutoffDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: ads } = await supabase
    .from('ads')
    .select('id, competitor_id, competitor_name, launch_date, days_active, is_active, is_video, cohort_week, is_breakout, is_cash_cow')
    .in('competitor_id', competitorIds)
    .gte('launch_date', cutoffDate);

  if (!ads || ads.length === 0) return null;

  const adIds = ads.map(a => a.id);

  // Fetch creative tags
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

  // Fetch video tags
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
  const lifecycleAds: LifecycleAd[] = ads.map(ad => ({
    id: ad.id,
    competitor_id: ad.competitor_id!,
    competitor_name: ad.competitor_name || competitorNameMap.get(ad.competitor_id!) || 'Unknown',
    launch_date: ad.launch_date,
    days_active: ad.days_active,
    is_active: ad.is_active,
    is_video: ad.is_video,
    cohort_week: ad.cohort_week,
    is_breakout: ad.is_breakout ?? false,
    is_cash_cow: ad.is_cash_cow ?? false,
    tags: tagsByAdId.get(ad.id) || emptyTags,
    videoTags: videoTagsByAdId.get(ad.id) || emptyTags,
  }));

  return {
    velocityTesters: competitors.map(c => ({ id: c.id, name: c.name })),
    ads: lifecycleAds,
  };
}

// --- Core Analysis ---

export function buildCohorts(ads: LifecycleAd[]): Cohort[] {
  // Group ads by competitor_id + cohort_week
  const groups = new Map<string, LifecycleAd[]>();

  for (const ad of ads) {
    const week = ad.cohort_week || getCohortWeek(ad.launch_date);
    const key = `${ad.competitor_id}:${week}`;
    const group = groups.get(key) || [];
    group.push(ad);
    groups.set(key, group);
  }

  const cohorts: Cohort[] = [];

  for (const [key, cohortAds] of Array.from(groups.entries())) {
    if (cohortAds.length < MIN_COHORT_SIZE) continue;

    const [competitorId] = key.split(':');
    const cohortStart = cohortAds[0].cohort_week || getCohortWeek(cohortAds[0].launch_date);
    const cohortEnd = getCohortEndDate(cohortStart);

    if (!isCohortReadyForBreakoutAnalysis(cohortEnd)) continue;

    const survivors = cohortAds.filter((a: LifecycleAd) => isSurvivor(a));
    const killed = cohortAds.filter((a: LifecycleAd) => !isSurvivor(a));
    const survivalRate = survivors.length / cohortAds.length;

    const isBreakoutCohort = survivalRate < BREAKOUT_SURVIVAL_RATE_THRESHOLD && survivors.length > 0;

    cohorts.push({
      competitorId,
      competitorName: cohortAds[0].competitor_name,
      cohortStart,
      cohortEnd,
      ads: cohortAds,
      survivors,
      killed,
      survivalRate,
      isBreakoutCohort,
    });
  }

  return cohorts;
}

export function analyzeBreakoutCohort(
  cohort: Cohort,
  brandId: string,
  analysisDate: string
): BreakoutEvent | null {
  if (!cohort.isBreakoutCohort) return null;

  // Filter to tagged ads only
  const hasTag = (ad: LifecycleAd) => Object.values(ad.tags).some(v => v !== null);
  const taggedSurvivors = cohort.survivors.filter(hasTag);
  const taggedKilled = cohort.killed.filter(hasTag);

  const survivorTagProfile = calculateTagProfile(taggedSurvivors);
  const killedTagProfile = calculateTagProfile(taggedKilled);

  const differentiatingElements = taggedSurvivors.length > 0 && taggedKilled.length > 0
    ? findDifferentiatingElements(survivorTagProfile, killedTagProfile)
    : [];

  const topSurvivorTraits = differentiatingElements
    .filter(e => e.direction === 'survivor_higher')
    .slice(0, 5)
    .map(e => `${e.value} (${e.dimension})`);

  const event: BreakoutEvent = {
    brandId,
    competitorId: cohort.competitorId,
    competitorName: cohort.competitorName,
    cohortStart: cohort.cohortStart,
    cohortEnd: cohort.cohortEnd,
    analysisDate,
    totalInCohort: cohort.ads.length,
    survivorsCount: cohort.survivors.length,
    killedCount: cohort.killed.length,
    survivalRate: cohort.survivalRate,
    survivorAdIds: cohort.survivors.map(a => a.id),
    killedAdIds: cohort.killed.map(a => a.id),
    survivorTagProfile,
    killedTagProfile,
    differentiatingElements,
    topSurvivorTraits,
    analysisSummary: '',
  };

  event.analysisSummary = generateBreakoutSummary(event);
  return event;
}

// --- Cash Cow Detection ---

export async function detectCashCowTransitions(brandId: string): Promise<CashCowTransition[]> {
  const supabase = getSupabaseAdmin();

  const { data: candidates } = await supabase
    .from('ads')
    .select('id, competitor_name, days_active, breakout_detected_at')
    .eq('is_breakout', true)
    .eq('is_cash_cow', false)
    .eq('is_active', true)
    .gte('days_active', CASH_COW_THRESHOLD_DAYS);

  if (!candidates || candidates.length === 0) return [];

  const adIds = candidates.map(a => a.id);

  const { data: creativeTags } = await supabase
    .from('creative_tags')
    .select('ad_id, format_type, hook_type_visual, human_presence, emotion_energy_level')
    .in('ad_id', adIds);

  const tagMap = new Map<string, Record<string, string | null>>();
  for (const tag of creativeTags || []) {
    const { ad_id: _, ...rest } = tag;
    tagMap.set(tag.ad_id as string, rest as Record<string, string | null>);
  }

  const now = new Date().toISOString();
  return candidates.map(ad => {
    const tags = tagMap.get(ad.id) || {};
    const traits = Object.entries(tags)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `${v} (${k})`);

    return {
      adId: ad.id,
      competitorName: ad.competitor_name || 'Unknown',
      daysActive: ad.days_active,
      breakoutDate: ad.breakout_detected_at || now,
      cashCowDate: now,
      traits,
    };
  });
}

// --- Main Analysis ---

export async function analyzeAdLifecycle(brandId: string): Promise<LifecycleAnalysis | null> {
  const supabase = getSupabaseAdmin();
  const analysisDate = new Date().toISOString().split('T')[0];

  // 1. Fetch lifecycle ads
  const fetchResult = await fetchLifecycleAds(brandId, LOOKBACK_DAYS);
  if (!fetchResult) return null;

  const { ads } = fetchResult;

  // 2. Build cohorts and find breakouts
  const cohorts = buildCohorts(ads);
  const breakoutEvents: BreakoutEvent[] = [];

  for (const cohort of cohorts) {
    if (!cohort.isBreakoutCohort) continue;
    const event = analyzeBreakoutCohort(cohort, brandId, analysisDate);
    if (event) breakoutEvents.push(event);
  }

  // 3. Detect cash cow transitions
  const cashCowTransitions = await detectCashCowTransitions(brandId);

  // 4. Aggregate winning patterns
  const winningPatterns = aggregateWinningPatterns(breakoutEvents);

  // 5. Collect all breakout ad IDs
  const allBreakoutAdIds = breakoutEvents.flatMap(e => e.survivorAdIds);
  const totalBreakoutAds = allBreakoutAdIds.length;
  const totalCashCows = cashCowTransitions.length;

  // 6. Generate market signals summary
  const marketSignals = breakoutEvents.length > 0
    ? `Found ${breakoutEvents.length} breakout cohort(s) with ${totalBreakoutAds} surviving ad(s). ${totalCashCows} cash cow transition(s) detected. Top winning patterns: ${winningPatterns.slice(0, 3).map(p => `${p.value} (${p.dimension})`).join(', ') || 'none yet'}.`
    : 'No breakout cohorts detected in current analysis window.';

  // 7. Persist results
  const now = new Date().toISOString();

  // Upsert breakout events
  for (const event of breakoutEvents) {
    await supabase
      .from('breakout_events')
      .upsert({
        brand_id: brandId,
        competitor_id: event.competitorId,
        competitor_name: event.competitorName,
        cohort_start: event.cohortStart,
        cohort_end: event.cohortEnd,
        analysis_date: event.analysisDate,
        total_in_cohort: event.totalInCohort,
        survivors_count: event.survivorsCount,
        killed_count: event.killedCount,
        survival_rate: event.survivalRate,
        survivor_ad_ids: event.survivorAdIds,
        killed_ad_ids: event.killedAdIds,
        survivor_tag_profile: event.survivorTagProfile,
        killed_tag_profile: event.killedTagProfile,
        differentiating_elements: event.differentiatingElements,
        top_survivor_traits: event.topSurvivorTraits,
        analysis_summary: event.analysisSummary,
      }, {
        onConflict: 'brand_id,competitor_id,cohort_start,cohort_end',
      });
  }

  // Flag breakout ads
  if (allBreakoutAdIds.length > 0) {
    await supabase
      .from('ads')
      .update({ is_breakout: true, breakout_detected_at: now })
      .in('id', allBreakoutAdIds)
      .eq('is_breakout', false);
  }

  // Flag cash cows
  for (const cow of cashCowTransitions) {
    await supabase
      .from('ads')
      .update({ is_cash_cow: true, cash_cow_detected_at: now })
      .eq('id', cow.adId);
  }

  // Backfill cohort_week for any ads missing it
  const adsMissingCohortWeek = ads.filter(a => !a.cohort_week);
  for (const ad of adsMissingCohortWeek) {
    await supabase
      .from('ads')
      .update({ cohort_week: getCohortWeek(ad.launch_date) })
      .eq('id', ad.id);
  }

  const analysis: LifecycleAnalysis = {
    brandId,
    analysisDate,
    breakoutEvents,
    cashCowTransitions,
    winningPatterns,
    totalBreakoutAds,
    totalCashCows,
    marketSignals,
  };

  // Upsert lifecycle snapshot
  await supabase
    .from('lifecycle_analysis_snapshots')
    .upsert({
      brand_id: brandId,
      snapshot_date: analysisDate,
      total_breakout_events: breakoutEvents.length,
      total_breakout_ads: totalBreakoutAds,
      total_cash_cows: totalCashCows,
      winning_patterns: winningPatterns,
      cash_cow_transitions: cashCowTransitions,
      analysis_json: analysis as unknown as Record<string, unknown>,
    }, {
      onConflict: 'brand_id,snapshot_date',
    });

  return analysis;
}

// --- Pipeline ---

export async function runLifecyclePipeline(): Promise<LifecyclePipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: LifecyclePipelineStats = {
    brandsAnalyzed: 0,
    breakoutEventsFound: 0,
    breakoutAdsFlagged: 0,
    cashCowsDetected: 0,
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
      const result = await analyzeAdLifecycle(brand.id);
      if (result) {
        stats.brandsAnalyzed++;
        stats.breakoutEventsFound += result.breakoutEvents.length;
        stats.breakoutAdsFlagged += result.totalBreakoutAds;
        stats.cashCowsDetected += result.totalCashCows;
        stats.snapshotsSaved++;
      }
    } catch (error) {
      console.error(`[LIFECYCLE] Error analyzing brand ${brand.id}:`, error);
      stats.failed++;
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
