/**
 * Runtime fallback computation for Gap Analysis and Breakout Analysis.
 *
 * When pre-computed snapshots (gap_analysis_snapshots, breakout_events) are
 * missing, these functions derive the same data shapes from creative_tags,
 * video_tags, and the allAds array already available in the report pipeline.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { TAXONOMY_DIMENSIONS } from '@/lib/tagging/taxonomy';
import { VIDEO_TAXONOMY_DIMENSIONS } from '@/lib/tagging/video-taxonomy';
import { formatDimensionLabel } from '@/lib/reports/creative-labels';
import { CreativeIntelligenceData } from '@/types/report';
import { Ad } from '@/types';

const ALL_DIMENSIONS: Record<string, readonly string[]> = {
  ...TAXONOMY_DIMENSIONS,
  ...VIDEO_TAXONOMY_DIMENSIONS,
};

// ---------------------------------------------------------------------------
// Gap Analysis fallback
// ---------------------------------------------------------------------------

export async function computeFallbackGaps(
  brandId: string,
  clientAdIds: string[],
  rawPrevalence: NonNullable<CreativeIntelligenceData['rawPrevalence']>,
): Promise<CreativeIntelligenceData['gaps']> {
  if (clientAdIds.length === 0 || rawPrevalence.length === 0) return null;

  const admin = getSupabaseAdmin();

  // Fetch creative_tags for client ads
  const { data: creativeTags } = await admin
    .from('creative_tags')
    .select('ad_id, format_type, hook_type_visual, human_presence, text_overlay_density, text_overlay_position, color_temperature, background_style, product_visibility, cta_visual_style, visual_composition, brand_element_presence, emotion_energy_level')
    .in('ad_id', clientAdIds);

  if (!creativeTags || creativeTags.length === 0) return null;

  // Fetch video_tags for client ads that are videos
  const { data: videoTags } = await admin
    .from('video_tags')
    .select('ad_id, script_structure, verbal_hook_type, pacing, audio_style, video_duration_bucket, narrative_arc, opening_frame')
    .in('ad_id', clientAdIds);

  // Build client prevalence: count how many client ads use each dimension/value
  const clientCounts: Record<string, Record<string, number>> = {};
  const clientDimTotals: Record<string, number> = {};

  for (const dimension of Object.keys(ALL_DIMENSIONS)) {
    clientCounts[dimension] = {};
    clientDimTotals[dimension] = 0;
  }

  for (const tag of creativeTags) {
    for (const dimension of Object.keys(TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        clientCounts[dimension][value] = (clientCounts[dimension][value] || 0) + 1;
        clientDimTotals[dimension]++;
      }
    }
  }

  for (const tag of videoTags || []) {
    for (const dimension of Object.keys(VIDEO_TAXONOMY_DIMENSIONS)) {
      const value = (tag as Record<string, unknown>)[dimension] as string | null;
      if (value) {
        clientCounts[dimension][value] = (clientCounts[dimension][value] || 0) + 1;
        clientDimTotals[dimension]++;
      }
    }
  }

  // Convert to percentages
  const clientPrevalence: Record<string, Record<string, number>> = {};
  for (const [dim, values] of Object.entries(clientCounts)) {
    clientPrevalence[dim] = {};
    const total = clientDimTotals[dim];
    if (total > 0) {
      for (const [val, count] of Object.entries(values)) {
        clientPrevalence[dim][val] = Math.round((count / total) * 100);
      }
    }
  }

  // Build competitor prevalence lookup from rawPrevalence (0-1 scale → percentage)
  const compPrev: Record<string, number> = {};
  for (const row of rawPrevalence) {
    compPrev[`${row.dimension}:${row.value}`] = Math.round(row.weightedPrevalence * 100);
  }

  // Find gaps: competitor prevalence > client prevalence
  const allGaps: Array<{
    dimension: string;
    value: string;
    clientPrevalence: number;
    competitorPrevalence: number;
    gapSize: number;
  }> = [];

  const allStrengths: Array<{
    dimension: string;
    value: string;
    clientPrevalence: number;
    competitorPrevalence: number;
  }> = [];

  for (const row of rawPrevalence) {
    const clientPct = clientPrevalence[row.dimension]?.[row.value] || 0;
    const compPct = Math.round(row.weightedPrevalence * 100);

    // Skip low-prevalence patterns (noise)
    if (compPct < 3 && clientPct < 3) continue;

    const gapSize = compPct - clientPct;

    if (gapSize > 5) {
      allGaps.push({
        dimension: row.dimension,
        value: row.value,
        clientPrevalence: clientPct,
        competitorPrevalence: compPct,
        gapSize,
      });
    } else if (clientPct > compPct + 5) {
      allStrengths.push({
        dimension: row.dimension,
        value: row.value,
        clientPrevalence: clientPct,
        competitorPrevalence: compPct,
      });
    }
  }

  allGaps.sort((a, b) => b.gapSize - a.gapSize);
  allStrengths.sort((a, b) => (b.clientPrevalence - b.competitorPrevalence) - (a.clientPrevalence - a.competitorPrevalence));

  const priorityGaps = allGaps.slice(0, 5).map(g => ({
    dimension: g.dimension,
    value: g.value,
    clientPrevalence: g.clientPrevalence,
    competitorPrevalence: g.competitorPrevalence,
    gapSize: g.gapSize,
    velocityDirection: 'stable',
    recommendation: `Test ${formatDimensionLabel(g.dimension, g.value)} — competitors use it at ${g.competitorPrevalence}% vs your ${g.clientPrevalence}%. This is a ${g.gapSize}pp gap worth closing.`,
  }));

  const strengths = allStrengths.slice(0, 3);

  if (priorityGaps.length === 0 && strengths.length === 0) return null;

  const biggestOpp = priorityGaps[0]
    ? formatDimensionLabel(priorityGaps[0].dimension, priorityGaps[0].value)
    : 'No major gaps';
  const strongestMatch = strengths[0]
    ? formatDimensionLabel(strengths[0].dimension, strengths[0].value)
    : 'No clear strengths';

  return {
    priorityGaps,
    strengths,
    summary: {
      biggestOpportunity: biggestOpp,
      strongestMatch: strongestMatch,
      totalGapsIdentified: allGaps.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Breakout Analysis fallback
// ---------------------------------------------------------------------------

const BREAKOUT_DAYS_THRESHOLD = 60;

export function computeFallbackBreakouts(
  competitorAds: Ad[],
): CreativeIntelligenceData['breakouts'] {
  // Breakout ads = ads that survived 60+ days (top longevity)
  const breakoutAds = competitorAds.filter(a => a.daysActive >= BREAKOUT_DAYS_THRESHOLD);

  if (breakoutAds.length < 3) return null;

  // --- Events: group by competitor ---
  const byCompetitor = new Map<string, Ad[]>();
  for (const ad of competitorAds) {
    const name = ad.competitorName;
    if (!byCompetitor.has(name)) byCompetitor.set(name, []);
    byCompetitor.get(name)!.push(ad);
  }

  const events: NonNullable<CreativeIntelligenceData['breakouts']>['events'] = [];

  const entries = Array.from(byCompetitor.entries());
  for (const [compName, compAds] of entries) {
    const survivors = compAds.filter((a: Ad) => a.daysActive >= BREAKOUT_DAYS_THRESHOLD);
    if (survivors.length === 0) continue;

    const launchDates = compAds.map((a: Ad) => a.launchDate).filter(Boolean).sort();
    const survivorTraits = computeTopTraits(survivors);

    events.push({
      competitorName: compName,
      cohortStart: launchDates[0] || '',
      cohortEnd: launchDates[launchDates.length - 1] || '',
      totalInCohort: compAds.length,
      survivorsCount: survivors.length,
      survivalRate: Math.round((survivors.length / compAds.length) * 100) / 100,
      topSurvivorTraits: survivorTraits,
      analysisSummary: `${survivors.length} of ${compAds.length} ads survived ${BREAKOUT_DAYS_THRESHOLD}+ days (${Math.round((survivors.length / compAds.length) * 100)}% survival rate).`,
      survivorAdIds: survivors.map((a: Ad) => a.id),
    });
  }

  events.sort((a, b) => b.survivalRate - a.survivalRate);

  // --- Cash Cows: top 5 longest-running ads ---
  const cashCows = [...breakoutAds]
    .sort((a, b) => (b.daysActive * (b.scoring?.final || 1)) - (a.daysActive * (a.scoring?.final || 1)))
    .slice(0, 5)
    .map(ad => ({
      adId: ad.id,
      competitorName: ad.competitorName,
      daysActive: ad.daysActive,
      traits: [ad.format, ad.hookType].filter(Boolean) as string[],
    }));

  // --- Winning Patterns: compare breakout vs all ---
  const winningPatterns = computeWinningPatterns(breakoutAds, competitorAds);

  return {
    events: events.slice(0, 3),
    cashCows,
    winningPatterns,
  };
}

function computeTopTraits(ads: Ad[]): string[] {
  const formatCounts = new Map<string, number>();
  const hookCounts = new Map<string, number>();

  for (const ad of ads) {
    if (ad.format) formatCounts.set(ad.format, (formatCounts.get(ad.format) || 0) + 1);
    if (ad.hookType) hookCounts.set(ad.hookType, (hookCounts.get(ad.hookType) || 0) + 1);
  }

  const traits: string[] = [];
  const topFormat = Array.from(formatCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topFormat) traits.push(`${topFormat[0]} (${Math.round((topFormat[1] / ads.length) * 100)}%)`);
  const topHook = Array.from(hookCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topHook) traits.push(`${topHook[0]} hook (${Math.round((topHook[1] / ads.length) * 100)}%)`);

  return traits;
}

function computeWinningPatterns(
  breakoutAds: Ad[],
  allAds: Ad[],
): NonNullable<CreativeIntelligenceData['breakouts']>['winningPatterns'] {
  const patterns: NonNullable<CreativeIntelligenceData['breakouts']>['winningPatterns'] = [];

  // Format distribution
  const breakoutFormats = distributionOf(breakoutAds, a => a.format);
  const allFormats = distributionOf(allAds, a => a.format);

  for (const [value, breakoutPct] of Array.from(breakoutFormats.entries())) {
    const allPct = allFormats.get(value) || 0;
    if (allPct > 0 && breakoutPct > allPct) {
      patterns.push({
        dimension: 'format_type',
        value,
        frequency: Math.round(breakoutPct * 100),
        avgLift: Math.round(((breakoutPct - allPct) / allPct) * 100) / 100,
        confidence: Math.min(breakoutAds.length / 10, 1),
      });
    }
  }

  // Hook type distribution
  const breakoutHooks = distributionOf(breakoutAds, a => a.hookType);
  const allHooks = distributionOf(allAds, a => a.hookType);

  for (const [value, breakoutPct] of Array.from(breakoutHooks.entries())) {
    const allPct = allHooks.get(value) || 0;
    if (allPct > 0 && breakoutPct > allPct) {
      patterns.push({
        dimension: 'hook_type_visual',
        value,
        frequency: Math.round(breakoutPct * 100),
        avgLift: Math.round(((breakoutPct - allPct) / allPct) * 100) / 100,
        confidence: Math.min(breakoutAds.length / 10, 1),
      });
    }
  }

  patterns.sort((a, b) => b.avgLift - a.avgLift);
  return patterns.slice(0, 5);
}

function distributionOf(ads: Ad[], getter: (a: Ad) => string | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  let total = 0;
  for (const ad of ads) {
    const val = getter(ad);
    if (val) {
      counts.set(val, (counts.get(val) || 0) + 1);
      total++;
    }
  }
  const dist = new Map<string, number>();
  if (total > 0) {
    for (const [key, count] of Array.from(counts.entries())) {
      dist.set(key, count / total);
    }
  }
  return dist;
}

// ---------------------------------------------------------------------------
// Helper: derive clientPatterns from gap data
// ---------------------------------------------------------------------------

export function deriveClientPatternsFromGaps(
  gaps: NonNullable<CreativeIntelligenceData['gaps']>,
): NonNullable<CreativeIntelligenceData['clientPatterns']> {
  const map = new Map<string, { dimension: string; value: string; prevalence: number }>();

  for (const g of gaps.priorityGaps) {
    map.set(`${g.dimension}:${g.value}`, {
      dimension: g.dimension,
      value: g.value,
      prevalence: g.clientPrevalence,
    });
  }
  for (const s of gaps.strengths) {
    const key = `${s.dimension}:${s.value}`;
    if (!map.has(key)) {
      map.set(key, {
        dimension: s.dimension,
        value: s.value,
        prevalence: s.clientPrevalence,
      });
    }
  }

  return Array.from(map.values());
}
