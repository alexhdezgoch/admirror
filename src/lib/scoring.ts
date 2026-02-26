import {
  VelocityTier,
  VelocitySignal,
  VelocityMetrics,
  ValueMetrics,
  AdScore,
  AdGrade,
  HookType
} from '@/types';

// Signal configuration for UI and labels
export const signalConfig: Record<VelocitySignal, {
  label: string;
  description: string;
  bgColor: string;
  textColor: string;
}> = {
  burn_test: {
    label: 'Testing',
    description: 'Recently launched, being evaluated',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700'
  },
  cash_cow: {
    label: 'Scaling',
    description: 'Proven winner with sustained performance',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700'
  },
  zombie: {
    label: 'Underperforming',
    description: 'Below market average — may need attention',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700'
  },
  rising_star: {
    label: 'Hot Start',
    description: 'Showing early promise with growing variations',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  standard: {
    label: 'Active',
    description: 'Solid performer, running consistently',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600'
  }
};

// Calculate velocity score and classify signal
export function calculateVelocity(daysActive: number, variationCount: number): VelocityMetrics {
  let signal: VelocitySignal;
  let score: number;
  let tier: VelocityTier;

  // Burn Test: Early aggressive testing (<=14 days, >=3 variations)
  if (daysActive <= 14 && variationCount >= 3) {
    signal = 'burn_test';
    // Score based on variation velocity (variations per day)
    const velocityRate = variationCount / Math.max(daysActive, 1);
    score = Math.min(100, Math.round(70 + velocityRate * 10));
    tier = 'testing';
  }
  // Cash Cow: Proven winner (>30 days, >=3 variations)
  else if (daysActive > 30 && variationCount >= 3) {
    signal = 'cash_cow';
    // Score increases with longevity and variation count
    const longevityBonus = Math.min(20, Math.floor((daysActive - 30) / 10) * 5);
    const variationBonus = Math.min(5, variationCount - 3);
    score = Math.min(100, 75 + longevityBonus + variationBonus);
    tier = 'scaling';
  }
  // Zombie: Forgotten ad (>30 days, 1 variation)
  else if (daysActive > 30 && variationCount === 1) {
    signal = 'zombie';
    // Low score, slightly higher with more days (brand may be lazy)
    score = Math.min(50, 30 + Math.floor(daysActive / 30) * 5);
    tier = 'scaling'; // Still technically scaling, just poorly
  }
  // Rising Star: Showing promise (14-30 days, >=2 variations)
  else if (daysActive >= 14 && daysActive <= 30 && variationCount >= 2) {
    signal = 'rising_star';
    // Score based on variation momentum
    const daysInRange = daysActive - 14;
    const momentumScore = Math.floor((daysInRange / 16) * 15);
    const variationScore = Math.min(15, (variationCount - 2) * 5);
    score = 55 + momentumScore + variationScore;
    tier = 'testing';
  }
  // Standard: Everything else
  else {
    signal = 'standard';
    if (daysActive <= 14) {
      // New ads
      tier = 'new';
      score = Math.min(40, 10 + daysActive * 2 + variationCount * 5);
    } else if (daysActive <= 30) {
      // Testing phase
      tier = 'testing';
      score = 40 + Math.floor((daysActive - 14) / 2) * 3 + variationCount * 3;
    } else {
      // Longer running but low variation
      tier = 'scaling';
      score = 50 + Math.min(25, variationCount * 5);
    }
  }

  return {
    tier,
    signal,
    score: Math.round(score),
    label: signalConfig[signal].label
  };
}

// Calculate value score using Hormozi-inspired value equation
// Value = (Dream Outcome * Perceived Likelihood) / (Time Delay * Effort/Sacrifice)
export function calculateValue(
  hookType: HookType,
  format: 'video' | 'static' | 'carousel',
  creativeElements: string[]
): ValueMetrics {
  // Dream Outcome (0-100): What transformation does the ad promise?
  let dreamOutcome = 50; // Base

  // Hooks that promise transformation score higher
  if (hookType === 'statement') dreamOutcome += 15; // Stories imply transformation
  if (hookType === 'social_proof') dreamOutcome += 10; // Others achieved it

  // Creative elements that show outcomes
  const outcomeElements = ['Before/After', 'transformation', 'results', 'success'];
  const hasOutcomeElement = creativeElements.some(el =>
    outcomeElements.some(oe => el.toLowerCase().includes(oe.toLowerCase()))
  );
  if (hasOutcomeElement) dreamOutcome += 15;

  // Video can show more dramatic transformations
  if (format === 'video') dreamOutcome += 10;

  dreamOutcome = Math.min(100, dreamOutcome);

  // Perceived Likelihood (0-100): How believable is it?
  let likelihood = 50; // Base

  // Social proof increases believability
  if (hookType === 'social_proof') likelihood += 20;

  // Evidence-based elements
  const evidenceElements = ['testimonial', 'review', 'vet', 'study', 'proof', 'verified'];
  const hasEvidenceElement = creativeElements.some(el =>
    evidenceElements.some(ee => el.toLowerCase().includes(ee.toLowerCase()))
  );
  if (hasEvidenceElement) likelihood += 15;

  // UGC style feels more authentic
  const hasUGC = creativeElements.some(el =>
    el.toLowerCase().includes('ugc') || el.toLowerCase().includes('customer')
  );
  if (hasUGC) likelihood += 10;

  likelihood = Math.min(100, likelihood);

  // Time Delay (1-10, lower is better): How quickly do they get results?
  let timeDelay = 5; // Base

  // Urgency hooks imply faster results
  if (hookType === 'urgency') timeDelay -= 2;

  // Videos can convey speed better
  if (format === 'video') timeDelay -= 0.5;

  // Elements showing quick results
  const speedElements = ['fast', 'quick', 'instant', 'days', 'weeks'];
  const hasSpeedElement = creativeElements.some(el =>
    speedElements.some(se => el.toLowerCase().includes(se.toLowerCase()))
  );
  if (hasSpeedElement) timeDelay -= 1;

  timeDelay = Math.max(1, Math.min(10, timeDelay));

  // Effort/Sacrifice (1-10, lower is better): How easy is it?
  let effortSacrifice = 5; // Base

  // Question hooks engage curiosity without demanding action
  if (hookType === 'question') effortSacrifice -= 1;

  // Elements showing ease
  const easeElements = ['easy', 'simple', 'just', 'no effort', 'automatic'];
  const hasEaseElement = creativeElements.some(el =>
    easeElements.some(ee => el.toLowerCase().includes(ee.toLowerCase()))
  );
  if (hasEaseElement) effortSacrifice -= 1;

  effortSacrifice = Math.max(1, Math.min(10, effortSacrifice));

  // Calculate value score (normalized to 0-100)
  // Formula: (dreamOutcome * likelihood) / (timeDelay * effortSacrifice)
  // Max theoretical: (100 * 100) / (1 * 1) = 10000
  // Min theoretical: (0 * 0) / (10 * 10) = 0
  // Typical range: (50 * 50) / (5 * 5) = 100
  const rawScore = (dreamOutcome * likelihood) / (timeDelay * effortSacrifice);
  // Normalize to 0-100 range (typical scores 50-250)
  const score = Math.min(100, Math.round(rawScore / 2));

  return {
    score,
    dreamOutcome,
    likelihood,
    timeDelay,
    effortSacrifice
  };
}

// Get dynamic weights based on ad characteristics
export function getWeights(
  daysActive: number,
  variationCount: number,
  velocitySignal: VelocitySignal
): { velocity: number; value: number } {
  // Zombies: Equal weight since velocity alone is misleading
  if (velocitySignal === 'zombie') {
    return { velocity: 0.5, value: 0.5 };
  }

  // New unproven ads: Lean heavily on velocity signals
  if (daysActive < 7 && variationCount < 3) {
    return { velocity: 0.9, value: 0.1 };
  }

  // Burn tests: Velocity matters more (they're testing aggressively)
  if (velocitySignal === 'burn_test') {
    return { velocity: 0.85, value: 0.15 };
  }

  // Cash cows: Still velocity-dominant but value matters for quality
  if (velocitySignal === 'cash_cow') {
    return { velocity: 0.75, value: 0.25 };
  }

  // Rising stars: Balanced leaning velocity
  if (velocitySignal === 'rising_star') {
    return { velocity: 0.7, value: 0.3 };
  }

  // Default: Standard weighting
  return { velocity: 0.8, value: 0.2 };
}

// Get letter grade from final score
export function getGrade(finalScore: number): AdGrade {
  if (finalScore >= 90) return 'A+';
  if (finalScore >= 80) return 'A';
  if (finalScore >= 65) return 'B';
  if (finalScore >= 50) return 'C';
  return 'D';
}

// Generate human-readable rationale
export function generateRationale(
  velocity: VelocityMetrics,
  value: ValueMetrics,
  weights: { velocity: number; value: number },
  daysActive: number,
  variationCount: number
): string {
  const { signal } = velocity;

  const rationaleMap: Record<VelocitySignal, string> = {
    burn_test: `Aggressive early testing with ${variationCount} variations in ${daysActive} days. This brand is rapidly iterating, suggesting strong conviction in the creative direction. Watch for scaling signals.`,
    cash_cow: `Proven performer running for ${daysActive} days with ${variationCount} variations. This ad has survived testing and is actively being invested in. Strong candidate for adaptation.`,
    zombie: `Running for ${daysActive} days but only ${variationCount} variation. Underperforming relative to market — may be forgotten or deprioritized. Evaluate creative quality independently.`,
    rising_star: `Showing momentum at ${daysActive} days with ${variationCount} variations. Early signs of success. Monitor for continued scaling or creative pivots.`,
    standard: `Active performer. ${daysActive > 30 ? 'Has longevity' : daysActive > 14 ? 'In testing phase' : 'Recently launched'}. ${variationCount > 1 ? 'Some variation testing.' : 'Single creative.'}`
  };

  let rationale = rationaleMap[signal];

  // Add value context if significantly weighted
  if (weights.value >= 0.25) {
    const valueContext = value.score >= 70
      ? ' Creative elements suggest strong value proposition.'
      : value.score >= 50
      ? ' Creative shows moderate value signals.'
      : ' Value proposition could be strengthened in creative.';
    rationale += valueContext;
  }

  return rationale;
}

// Explain velocity score for tooltips
export function explainVelocityScore(
  velocity: VelocityMetrics,
  daysActive: number,
  variationCount: number
): string {
  const signalExplanations: Record<VelocitySignal, string> = {
    burn_test: `Testing: Aggressive early testing (${daysActive} days, ${variationCount} variations). High velocity indicates rapid iteration to find winners.`,
    cash_cow: `Scaling: Proven performer running ${daysActive} days with ${variationCount} variations. Survived testing and actively scaled.`,
    zombie: `Underperforming: Running ${daysActive} days with only ${variationCount} variation. Below market average — may be forgotten or on autopilot.`,
    rising_star: `Hot Start: Showing promise at ${daysActive} days with ${variationCount} variations. Building momentum.`,
    standard: `Active: Consistent ad (${daysActive} days, ${variationCount} variations). Solid performer without distinctive velocity signals.`
  };
  return `${signalExplanations[velocity.signal]}\n\nScore: ${velocity.score}/100`;
}

// Explain value score for tooltips
export function explainValueScore(value: ValueMetrics): string {
  return `Value Score uses the Value Equation:
(Dream × Likelihood) / (Time × Effort)

• Dream Outcome: ${value.dreamOutcome}/100
  How compelling is the transformation?
• Likelihood: ${value.likelihood}/100
  How believable is the claim?
• Time Delay: ${value.timeDelay}/10 (lower = better)
  How fast are results promised?
• Effort: ${value.effortSacrifice}/10 (lower = better)
  How easy does it seem?

Score: ${value.score}/100`;
}

// Explain overall grade for tooltips
export function explainGrade(score: AdScore): string {
  const gradeDescriptions: Record<AdGrade, string> = {
    'A+': 'Exceptional - top-tier velocity and value',
    'A': 'Very strong performer worth studying',
    'B': 'Good ad with solid metrics',
    'C': 'Average, some learning opportunities',
    'D': 'Weak signals, likely underperforming'
  };

  return `Grade ${score.grade}: ${gradeDescriptions[score.grade]}

Final Score: ${score.final}/100
• Velocity: ${score.velocity.score} (${Math.round(score.weights.velocity * 100)}% weight)
• Value: ${score.value.score} (${Math.round(score.weights.value * 100)}% weight)`;
}

// Get Facebook Ad Library URL for an ad
export function getAdLibraryUrl(adId: string): string {
  return `https://www.facebook.com/ads/library/?id=${adId}`;
}

// Main scoring function
export function scoreAd(
  daysActive: number,
  variationCount: number,
  hookType: HookType,
  format: 'video' | 'static' | 'carousel',
  creativeElements: string[]
): AdScore {
  // Calculate component scores
  const velocity = calculateVelocity(daysActive, variationCount);
  const value = calculateValue(hookType, format, creativeElements);
  const weights = getWeights(daysActive, variationCount, velocity.signal);

  // Calculate final weighted score
  const final = Math.round(
    velocity.score * weights.velocity + value.score * weights.value
  );

  // Determine grade
  const grade = getGrade(final);

  // Generate explanation
  const rationale = generateRationale(velocity, value, weights, daysActive, variationCount);

  return {
    final,
    grade,
    velocity,
    value,
    weights,
    rationale
  };
}
