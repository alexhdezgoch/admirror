import { Ad, HookType, VelocitySignal } from '@/types';

// Distribution data type for charts
export interface DistributionItem {
  name: string;
  value: number;
  color: string;
}

// Hook library data type
export interface HookData {
  text: string;
  type: HookType;
  frequency: number;
  adIds: string[];
}

/**
 * Largest-remainder method: floor each percentage, then distribute
 * the deficit to items with the largest fractional remainders.
 * Guarantees the values sum to exactly 100 (when non-empty).
 */
export function roundToSum100(items: { name: string; rawFraction: number; color: string }[]): DistributionItem[] {
  const nonZero = items.filter(i => i.rawFraction > 0);
  if (nonZero.length === 0) return items.map(i => ({ name: i.name, value: 0, color: i.color }));

  const withFloor = nonZero.map(i => {
    const exact = i.rawFraction * 100;
    return { ...i, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  const floorSum = withFloor.reduce((s, i) => s + i.floor, 0);
  let deficit = 100 - floorSum;

  const sorted = [...withFloor].sort((a, b) => b.remainder - a.remainder);
  for (const item of sorted) {
    if (deficit <= 0) break;
    item.floor += 1;
    deficit -= 1;
  }

  const resultMap = new Map(withFloor.map(i => [i.name, i.floor]));
  return items.map(i => ({ name: i.name, value: resultMap.get(i.name) ?? 0, color: i.color }));
}

/**
 * Calculate format distribution (video/static/carousel) from ads
 */
export function calculateFormatDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'Video', value: 0, color: '#6366f1' },
      { name: 'Static', value: 0, color: '#8b5cf6' },
      { name: 'Carousel', value: 0, color: '#a855f7' }
    ];
  }

  const counts = { video: 0, static: 0, carousel: 0 };
  let other = 0;
  ads.forEach(ad => {
    if (ad.format === 'video') counts.video++;
    else if (ad.format === 'static') counts.static++;
    else if (ad.format === 'carousel') counts.carousel++;
    else other++;
  });

  const total = ads.length;
  const items = [
    { name: 'Video', rawFraction: counts.video / total, color: '#6366f1' },
    { name: 'Static', rawFraction: counts.static / total, color: '#8b5cf6' },
    { name: 'Carousel', rawFraction: counts.carousel / total, color: '#a855f7' },
    ...(other > 0 ? [{ name: 'Other', rawFraction: other / total, color: '#cbd5e1' }] : []),
  ];
  return roundToSum100(items);
}

/**
 * Calculate velocity tier distribution (scaling/testing/new) from ads
 */
export function calculateVelocityDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'Scaling', value: 0, color: '#22c55e' },
      { name: 'Testing', value: 0, color: '#eab308' },
      { name: 'New', value: 0, color: '#94a3b8' }
    ];
  }

  const tierCounts = { scaling: 0, testing: 0, new: 0 };
  let unscored = 0;
  ads.forEach(ad => {
    if (ad.scoring?.velocity?.tier) {
      tierCounts[ad.scoring.velocity.tier]++;
    } else {
      unscored++;
    }
  });

  const total = ads.length;
  const items = [
    { name: 'Scaling', rawFraction: tierCounts.scaling / total, color: '#22c55e' },
    { name: 'Testing', rawFraction: tierCounts.testing / total, color: '#eab308' },
    { name: 'New', rawFraction: tierCounts.new / total, color: '#94a3b8' },
    ...(unscored > 0 ? [{ name: 'Unscored', rawFraction: unscored / total, color: '#cbd5e1' }] : []),
  ];
  return roundToSum100(items);
}

/**
 * Calculate signal classification distribution from ads
 */
export function calculateSignalDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'Scaling', value: 0, color: '#22c55e' },
      { name: 'Hot Start', value: 0, color: '#3b82f6' },
      { name: 'Testing', value: 0, color: '#f97316' },
      { name: 'Active', value: 0, color: '#94a3b8' },
      { name: 'Underperforming', value: 0, color: '#ef4444' }
    ];
  }

  const signalCounts: Record<VelocitySignal, number> = {
    burn_test: 0,
    cash_cow: 0,
    zombie: 0,
    rising_star: 0,
    standard: 0
  };

  let unscored = 0;
  ads.forEach(ad => {
    if (ad.scoring?.velocity?.signal) {
      signalCounts[ad.scoring.velocity.signal]++;
    } else {
      unscored++;
    }
  });

  const total = ads.length;
  const items = [
    { name: 'Scaling', rawFraction: signalCounts.cash_cow / total, color: '#22c55e' },
    { name: 'Hot Start', rawFraction: signalCounts.rising_star / total, color: '#3b82f6' },
    { name: 'Testing', rawFraction: signalCounts.burn_test / total, color: '#f97316' },
    { name: 'Active', rawFraction: signalCounts.standard / total, color: '#94a3b8' },
    { name: 'Underperforming', rawFraction: signalCounts.zombie / total, color: '#ef4444' },
    ...(unscored > 0 ? [{ name: 'Unscored', rawFraction: unscored / total, color: '#cbd5e1' }] : []),
  ];
  return roundToSum100(items);
}

/**
 * Calculate grade distribution from ads
 */
export function calculateGradeDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'A+', value: 0, color: '#22c55e' },
      { name: 'A', value: 0, color: '#84cc16' },
      { name: 'B', value: 0, color: '#eab308' },
      { name: 'C', value: 0, color: '#f97316' },
      { name: 'D', value: 0, color: '#ef4444' }
    ];
  }

  const gradeCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
  let ungraded = 0;
  ads.forEach(ad => {
    if (ad.scoring?.grade && gradeCounts[ad.scoring.grade] !== undefined) {
      gradeCounts[ad.scoring.grade]++;
    } else {
      ungraded++;
    }
  });

  const total = ads.length;
  const items = [
    { name: 'A+', rawFraction: gradeCounts['A+'] / total, color: '#22c55e' },
    { name: 'A', rawFraction: gradeCounts['A'] / total, color: '#84cc16' },
    { name: 'B', rawFraction: gradeCounts['B'] / total, color: '#eab308' },
    { name: 'C', rawFraction: gradeCounts['C'] / total, color: '#f97316' },
    { name: 'D', rawFraction: gradeCounts['D'] / total, color: '#ef4444' },
    ...(ungraded > 0 ? [{ name: 'Ungraded', rawFraction: ungraded / total, color: '#cbd5e1' }] : []),
  ];
  return roundToSum100(items);
}

/**
 * Calculate hook type distribution from ads
 */
export function calculateHookTypeDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'Question', value: 0, color: '#3b82f6' },
      { name: 'Statement', value: 0, color: '#10b981' },
      { name: 'Social Proof', value: 0, color: '#f59e0b' },
      { name: 'Urgency', value: 0, color: '#ef4444' }
    ];
  }

  const counts = { question: 0, statement: 0, social_proof: 0, urgency: 0 };
  let other = 0;
  ads.forEach(ad => {
    if (ad.hookType && counts[ad.hookType] !== undefined) {
      counts[ad.hookType]++;
    } else {
      other++;
    }
  });

  const total = ads.length;
  const items = [
    { name: 'Question', rawFraction: counts.question / total, color: '#3b82f6' },
    { name: 'Statement', rawFraction: counts.statement / total, color: '#10b981' },
    { name: 'Social Proof', rawFraction: counts.social_proof / total, color: '#f59e0b' },
    { name: 'Urgency', rawFraction: counts.urgency / total, color: '#ef4444' },
    ...(other > 0 ? [{ name: 'Other', rawFraction: other / total, color: '#cbd5e1' }] : []),
  ];
  return roundToSum100(items);
}

/**
 * Extract hook library from ads - groups hooks by text and type
 */
export function extractHookLibrary(ads: Ad[]): HookData[] {
  const hookMap = new Map<string, { type: HookType; adIds: string[] }>();

  ads.forEach(ad => {
    if (ad.hookText && ad.hookType) {
      const key = ad.hookText.trim().toLowerCase();
      if (hookMap.has(key)) {
        hookMap.get(key)!.adIds.push(ad.id);
      } else {
        hookMap.set(key, { type: ad.hookType, adIds: [ad.id] });
      }
    }
  });

  // Convert to array and sort by frequency
  const hooks: HookData[] = [];
  hookMap.forEach((value, key) => {
    // Find the original text (not lowercased)
    const originalAd = ads.find(a => a.hookText?.trim().toLowerCase() === key);
    hooks.push({
      text: originalAd?.hookText || key,
      type: value.type,
      frequency: value.adIds.length,
      adIds: value.adIds
    });
  });

  return hooks.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
}

/**
 * Detect creative patterns from ads based on creative elements
 */
export interface CreativePatternData {
  name: string;
  description: string;
  adoptionRate: number;
  trend: 'rising' | 'stable' | 'declining';
  exampleAds: string[];
}

export function detectCreativePatterns(ads: Ad[]): CreativePatternData[] {
  if (ads.length === 0) return [];

  // Pattern definitions with keywords to detect
  const patternDefs = [
    {
      name: 'UGC Testimonial',
      keywords: ['UGC', 'testimonial', 'Customer', 'customer'],
      description: 'User-generated content style testimonials with authentic feel'
    },
    {
      name: 'Before/After',
      keywords: ['Before/After', 'transformation', 'split screen'],
      description: 'Visual comparison showing results or transformations'
    },
    {
      name: 'Product Close-up',
      keywords: ['Product close-up', 'product', 'Unboxing'],
      description: 'Focused shots of the product with detail emphasis'
    },
    {
      name: 'Founder/Expert Story',
      keywords: ['founder', 'Direct to camera', 'Vet', 'expert'],
      description: 'Authority figures speaking directly about the product'
    },
    {
      name: 'Urgency/Scarcity',
      keywords: ['urgency', 'countdown', 'limited', 'CTA'],
      description: 'Time-limited offers or stock scarcity messaging'
    },
    {
      name: 'Comparison Format',
      keywords: ['Comparison', 'Competitor', 'vs'],
      description: 'Side-by-side comparisons with alternatives'
    }
  ];

  const patterns: CreativePatternData[] = [];

  patternDefs.forEach(def => {
    const matchingAds = ads.filter(ad =>
      ad.creativeElements?.some(el =>
        def.keywords.some(kw => el.toLowerCase().includes(kw.toLowerCase()))
      )
    );

    if (matchingAds.length > 0) {
      // Calculate adoption rate
      const adoptionRate = Math.round((matchingAds.length / ads.length) * 100);

      // Determine trend based on recency of ads using this pattern
      const recentAds = matchingAds.filter(ad => ad.daysActive <= 14);
      const olderAds = matchingAds.filter(ad => ad.daysActive > 30);
      let trend: 'rising' | 'stable' | 'declining' = 'stable';
      if (recentAds.length > olderAds.length * 1.5) trend = 'rising';
      else if (olderAds.length > recentAds.length * 1.5) trend = 'declining';

      patterns.push({
        name: def.name,
        description: def.description,
        adoptionRate,
        trend,
        exampleAds: matchingAds.slice(0, 4).map(a => a.id)
      });
    }
  });

  return patterns.sort((a, b) => b.adoptionRate - a.adoptionRate);
}

/**
 * Detect trend patterns from ads
 */
export interface TrendCardData {
  id: string;
  patternName: string;
  adoptionRate: number;
  trend: 'rising' | 'stable' | 'declining';
  exampleAds: string[];
  description: string;
}

export function detectTrendPatterns(ads: Ad[]): TrendCardData[] {
  if (ads.length < 3) return [];

  const trends: TrendCardData[] = [];

  // Format trends
  const formatDist = calculateFormatDistribution(ads);
  formatDist.forEach((format, idx) => {
    if (format.value >= 15) {
      const formatAds = ads.filter(a => a.format.toLowerCase() === format.name.toLowerCase());
      const recentPct = formatAds.filter(a => a.daysActive <= 14).length / (formatAds.length || 1);

      trends.push({
        id: `trend-format-${idx}`,
        patternName: `${format.name} Ads`,
        adoptionRate: format.value,
        trend: recentPct > 0.4 ? 'rising' : recentPct < 0.2 ? 'declining' : 'stable',
        exampleAds: formatAds.slice(0, 3).map(a => a.id),
        description: `${format.value}% of competitor ads use ${format.name.toLowerCase()} format`
      });
    }
  });

  // Hook type trends
  const hookDist = calculateHookTypeDistribution(ads);
  hookDist.forEach((hook, idx) => {
    if (hook.value >= 15) {
      const hookTypeKey = hook.name.toLowerCase().replace(' ', '_') as HookType;
      const hookAds = ads.filter(a => a.hookType === hookTypeKey);
      const recentPct = hookAds.filter(a => a.daysActive <= 14).length / (hookAds.length || 1);

      trends.push({
        id: `trend-hook-${idx}`,
        patternName: `${hook.name} Hooks`,
        adoptionRate: hook.value,
        trend: recentPct > 0.4 ? 'rising' : recentPct < 0.2 ? 'declining' : 'stable',
        exampleAds: hookAds.slice(0, 3).map(a => a.id),
        description: `${hook.value}% of ads lead with ${hook.name.toLowerCase()} style hooks`
      });
    }
  });

  return trends.sort((a, b) => b.adoptionRate - a.adoptionRate).slice(0, 6);
}
