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
  ads.forEach(ad => {
    if (ad.format === 'video') counts.video++;
    else if (ad.format === 'static') counts.static++;
    else if (ad.format === 'carousel') counts.carousel++;
  });

  const total = ads.length;
  return [
    { name: 'Video', value: Math.round((counts.video / total) * 100), color: '#6366f1' },
    { name: 'Static', value: Math.round((counts.static / total) * 100), color: '#8b5cf6' },
    { name: 'Carousel', value: Math.round((counts.carousel / total) * 100), color: '#a855f7' }
  ];
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
  ads.forEach(ad => {
    if (ad.scoring?.velocity?.tier) {
      tierCounts[ad.scoring.velocity.tier]++;
    }
  });

  const total = ads.length;
  return [
    { name: 'Scaling', value: Math.round((tierCounts.scaling / total) * 100), color: '#22c55e' },
    { name: 'Testing', value: Math.round((tierCounts.testing / total) * 100), color: '#eab308' },
    { name: 'New', value: Math.round((tierCounts.new / total) * 100), color: '#94a3b8' }
  ];
}

/**
 * Calculate signal classification distribution from ads
 */
export function calculateSignalDistribution(ads: Ad[]): DistributionItem[] {
  if (ads.length === 0) {
    return [
      { name: 'Cash Cow', value: 0, color: '#22c55e' },
      { name: 'Rising Star', value: 0, color: '#3b82f6' },
      { name: 'Burn Test', value: 0, color: '#f97316' },
      { name: 'Standard', value: 0, color: '#94a3b8' },
      { name: 'Zombie', value: 0, color: '#64748b' }
    ];
  }

  const signalCounts: Record<VelocitySignal, number> = {
    burn_test: 0,
    cash_cow: 0,
    zombie: 0,
    rising_star: 0,
    standard: 0
  };

  ads.forEach(ad => {
    if (ad.scoring?.velocity?.signal) {
      signalCounts[ad.scoring.velocity.signal]++;
    }
  });

  const total = ads.length;
  return [
    { name: 'Cash Cow', value: Math.round((signalCounts.cash_cow / total) * 100), color: '#22c55e' },
    { name: 'Rising Star', value: Math.round((signalCounts.rising_star / total) * 100), color: '#3b82f6' },
    { name: 'Burn Test', value: Math.round((signalCounts.burn_test / total) * 100), color: '#f97316' },
    { name: 'Standard', value: Math.round((signalCounts.standard / total) * 100), color: '#94a3b8' },
    { name: 'Zombie', value: Math.round((signalCounts.zombie / total) * 100), color: '#64748b' }
  ];
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
  ads.forEach(ad => {
    if (ad.scoring?.grade) {
      gradeCounts[ad.scoring.grade]++;
    }
  });

  const total = ads.length;
  return [
    { name: 'A+', value: Math.round((gradeCounts['A+'] / total) * 100), color: '#22c55e' },
    { name: 'A', value: Math.round((gradeCounts['A'] / total) * 100), color: '#84cc16' },
    { name: 'B', value: Math.round((gradeCounts['B'] / total) * 100), color: '#eab308' },
    { name: 'C', value: Math.round((gradeCounts['C'] / total) * 100), color: '#f97316' },
    { name: 'D', value: Math.round((gradeCounts['D'] / total) * 100), color: '#ef4444' }
  ];
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
  ads.forEach(ad => {
    if (ad.hookType && counts[ad.hookType] !== undefined) {
      counts[ad.hookType]++;
    }
  });

  const total = ads.length;
  return [
    { name: 'Question', value: Math.round((counts.question / total) * 100), color: '#3b82f6' },
    { name: 'Statement', value: Math.round((counts.statement / total) * 100), color: '#10b981' },
    { name: 'Social Proof', value: Math.round((counts.social_proof / total) * 100), color: '#f59e0b' },
    { name: 'Urgency', value: Math.round((counts.urgency / total) * 100), color: '#ef4444' }
  ];
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
