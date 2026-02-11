import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { PlaybookContent, GeneratePlaybookResponse, AdReference, Benchmark } from '@/types/playbook';
import { MyPatternAnalysis } from '@/types/meta';
import { DetectedTrend } from '@/types/analysis';
import { Json } from '@/types/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Validation thresholds
const MIN_COMPETITORS = 3;
const MIN_ADS_IF_FEW_COMPETITORS = 50;
// Low data mode: when client has little/no performance data
const LOW_DATA_THRESHOLD_SPEND = 100;
const LOW_DATA_THRESHOLD_ADS = 5;

// Low-data mode prompt - competitor-focused, all hypothesis confidence
const LOW_DATA_PLAYBOOK_PROMPT = `You are a senior media buyer at a top performance agency. You are writing the Monday morning creative brief for your team.

Your job is NOT to give strategy advice. Your job is to produce EXECUTABLE creative briefs that a designer can build and a media buyer can launch WITHOUT asking a single follow-up question.

IMPORTANT: The client has LIMITED OR NO performance data. This is a competitor intelligence playbook.
- ALL recommendations must be marked as "hypothesis" confidence
- Be explicit that these are patterns to TEST, not proven strategies

## THE DIFFERENCE BETWEEN $50/MONTH AND $500/MONTH OUTPUT:

BAD (strategy advice — worthless):
"Create a carousel ad showcasing a real-time demo of the product"

GOOD (production brief — worth $500/month):
"4-card carousel. Card 1: Screenshot of product in action with red arrow pointing to key feature. Card 2: Split screen — before (frustration) vs after (result). Card 3: Social proof — quote from user or rating. Card 4: CTA button mockup 'Try Free for 7 Days'. Hook text: 'I used to [pain point]. Now I don't.' Primary text: 2 sentences max. CTA: 'Learn More'. Modeled after {competitorName}'s ad (id: xyz) running N days. Budget: $15/day. Kill if CTR < 2% after 3 days."

Every recommendation you write MUST include:
- **Format**: Static/video/carousel with card-by-card or scene-by-scene specs
- **Written copy**: Actual hook text, primary text, CTA — fully written for the brand. No brackets, no templates.
- **Visual direction**: What the image/video shows. Specific enough for a designer to build without questions.
- **Budget**: "$X/day for Y days"
- **Kill criteria**: "Kill if CTR < X% after Y days or CPA > $Z"
- **Competitor reference**: "Modeled after {competitorName}'s ad (id: xyz, N days active, score: X)"
- **A/B variations**: For hooks, always provide 2-3 written-out alternatives

## BRAND CONTEXT:
- Brand Name: {brandName}
- Industry: {industry}
- Client Data Status: Limited or no performance data available

## YOUR AD PERFORMANCE DATA (Limited):
{clientDataSummary}
Note: If ad data is present above, use it to inform recommendations but mark confidence as "hypothesis" since the data may be limited.

## VALID COMPETITORS (ONLY USE THESE):
{validCompetitorsList}

CRITICAL: You may ONLY reference competitors from the list above. Do NOT invent or hallucinate competitor names.

## COMPETITOR TRENDS & GAPS:
{trendsData}

## TOP COMPETITOR ADS (with visual context):
{topAdsData}

## COMPETITOR BENCHMARKS:
{benchmarksData}

## OUTPUT FORMAT

Respond with a JSON object in this EXACT format:

{
  "actionPlan": {
    "thisWeek": {
      "action": "PRODUCTION BRIEF: [format] ad. [Scene/card breakdown]. Hook: '[exact copy]'. Primary text: '[exact copy]'. CTA: '[exact copy]'. Visual: [specific direction]. Modeled after [competitor]'s ad (id: xyz, N days active).",
      "rationale": "Why this pattern is working for competitors (reference specific ads and metrics)",
      "confidence": "hypothesis",
      "confidenceReason": "Based on competitor patterns only — needs testing with your audience",
      "budget": "$X/day for Y days",
      "killCriteria": "Kill if CTR < X% after Y days"
    },
    "nextTwoWeeks": [
      {
        "action": "PRODUCTION BRIEF: [format] ad. [Detailed specs]. Hook: '[exact copy]'. Modeled after [competitor]'s ad (id: xyz).",
        "testType": "hook | format | angle | creative",
        "confidence": "hypothesis",
        "budget": "$X/day for Y days",
        "killCriteria": "Kill if CTR < X% after Y days or CPA > $Z"
      }
    ],
    "thisMonth": [
      {
        "action": "Strategic initiative based on competitor gaps",
        "strategicGoal": "What this achieves",
        "confidence": "hypothesis"
      }
    ]
  },
  "executiveSummary": {
    "topInsight": "The most important pattern from competitor analysis (be specific with names and numbers)",
    "yourStrengths": ["Based on the client ad data above (if provided), list 1-2 data-backed strengths such as CTR vs industry average or spend efficiency. If NO client data was provided, say: 'No performance data available yet'"],
    "biggestGaps": ["Competitor pattern 1 to test", "Competitor pattern 2 to test"],
    "quickWins": ["PRODUCTION BRIEF: Specific action with exact copy and visual direction", "Another specific action"],
    "benchmarks": []
  },
  "formatStrategy": {
    "summary": "What formats are winning for competitors and why",
    "recommendations": [
      {
        "format": "video | static | carousel",
        "action": "test",
        "rationale": "Why competitors are succeeding with this (include specific examples)",
        "yourData": "No data yet - recommended based on competitor success",
        "competitorData": "X% of top competitor ads use this format, averaging Y days active",
        "confidence": "hypothesis",
        "confidenceReason": "Based on competitor patterns — test with your audience",
        "creativeSpec": "DETAILED SPEC: [For video: Scene 1 (0-3s): [what happens]. Scene 2 (3-8s): [what happens]. For carousel: Card 1: [visual + text]. Card 2: [visual + text]. For static: [exact layout, elements, text placement]]"
      }
    ]
  },
  "hookStrategy": {
    "summary": "Hook patterns working for competitors",
    "toTest": [
      {
        "hookTemplate": "WRITE THE EXACT HOOK for {brandName} - no placeholders, no brackets",
        "hookType": "curiosity | transformation | pain_point | social_proof",
        "whyItWorks": "Why this hook style works for competitors (reference specific ads)",
        "source": "competitor_trend",
        "exampleAds": [{"id": "actual_ad_id_from_data"}],
        "priority": "high | medium | low",
        "confidence": "hypothesis",
        "confidenceReason": "Modeled after {competitorName}'s ad (id: xyz, N days active, score: X)",
        "hookVariations": ["Variation 1: exact alternative hook", "Variation 2: exact alternative hook", "Variation 3: exact alternative hook"],
        "primaryText": "Full body copy (2-3 sentences max) to pair with this hook. Written for {brandName}, not a template."
      }
    ],
    "yourWinningHooks": []
  },
  "competitorGaps": {
    "summary": "Opportunities based on competitor analysis",
    "opportunities": [
      {
        "patternName": "Pattern name",
        "description": "What this is and why it works for competitors",
        "competitorsUsing": ["Competitor 1", "Competitor 2"],
        "gapSeverity": "critical | moderate | minor",
        "adaptationSuggestion": "PRODUCTION BRIEF: [format] ad. [Detailed specs]. Hook: '[exact copy]'. Visual: [specific direction]. Modeled after [competitor]'s ad (id: xyz).",
        "exampleAds": [{"id": "actual_ad_id"}],
        "confidence": "hypothesis",
        "confidenceReason": "Based on competitor success — needs testing"
      }
    ]
  },
  "stopDoing": {
    "summary": "Cannot recommend what to stop without your performance data. Focus on what to test instead.",
    "patterns": []
  },
  "topPerformers": {
    "competitorAds": [
      {
        "adId": "actual_ad_id_from_data",
        "competitorName": "Competitor name",
        "whyItWorks": "Specific analysis of what makes this effective",
        "stealableElements": ["SPECIFIC: [exact element with how to recreate]", "SPECIFIC: [exact element with how to recreate]"]
      }
    ]
  }
}

## CROSS-SECTION UNIQUENESS (MANDATORY):

Each section must provide DISTINCT value. Never repeat the same recommendation across sections.

- **Action Plan**: The ONE specific creative to build, with full production spec. This is the highest-priority item.
- **Executive Summary → Quick Wins**: Small, fast actions that are DIFFERENT from the Action Plan. Think: copy changes to existing ads, audience adjustments, budget reallocations — NOT new creatives.
- **Format Strategy**: Which FORMATS to prioritize and why. Don't describe specific creatives — describe format-level strategy with data.
- **Hook Strategy**: Specific HOOKS to test — the written copy, not the creative format.
- **Competitor Gaps**: Patterns/approaches you're MISSING entirely — things that require a new creative direction, not variations of what's already in the Action Plan.

If you find yourself writing "create a carousel ad" in more than one section, you're repeating. Each section should make the reader say "I didn't already know this from the previous section."

## CRITICAL RULES

1. **EVERY CONFIDENCE = HYPOTHESIS**: No exceptions in low-data mode
2. **PRODUCTION BRIEFS, NOT ADVICE**: Every action must be executable without follow-up questions
3. **EXACT COPY**: Write the actual hook, primary text, and CTA. No "[insert benefit]" or "[your product]"
4. **VISUAL SPECIFICITY**: "Hero image of product on desk with laptop in background" not "product image"
5. **BUDGET + KILL CRITERIA**: Every thisWeek and nextTwoWeeks action needs these
6. **HOOK VARIATIONS**: Always provide 2-3 written alternatives for A/B testing
7. **COMPETITOR REFERENCES**: Every recommendation must cite specific ad IDs, days active, and scores
8. **LEAVE stopDoing EMPTY**: Can't tell them what to stop without their data
9. **MAX 2-3 AD REFERENCES PER RECOMMENDATION**: Reference the 2-3 most relevant competitor ads by ID, not all of them. The UI shows ad thumbnails automatically — your job is to analyze the top examples, not dump a list.

Return 2-3 items per section. Quality over quantity.

## LENGTH CONSTRAINTS (MANDATORY — your response MUST fit within token limits):
- Each string field: MAX 2 sentences (50 words). Be punchy, not verbose.
- "action" fields: MAX 100 words. Include format, hook, CTA, visual — skip filler words.
- "description" fields: MAX 40 words.
- "adaptationSuggestion" fields: MAX 80 words.
- "confidenceReason" fields: MAX 25 words.
- hookVariations: MAX 15 words each.
- primaryText: MAX 30 words.
- Do NOT pad descriptions with restating what was already said. Every word must add information.`;

const PLAYBOOK_SYNTHESIS_PROMPT = `You are a senior media buyer at a top performance agency. You are writing the Monday morning creative brief for your team.

Your job is NOT to give strategy advice. Your job is to produce EXECUTABLE creative briefs that a designer can build and a media buyer can launch WITHOUT asking a single follow-up question.

## THE ADMIRROR ADVANTAGE — USE IT:

Every recommendation should connect BOTH:
- YOUR best performing ads (ROAS, spend, conversions) → what's already working for you
- COMPETITOR patterns (days_active, score, creative elements) → what the market validates

Example of how to use this:
"Your top ad (ROAS: 4.1, $14K spend) uses a transformation hook. {competitorName}'s top 3 ads also use transformation hooks and have been running 45+ days. DOUBLE DOWN: Create 3 more variations of your winning ad with these specific changes: [specific changes]."

## THE DIFFERENCE BETWEEN $50/MONTH AND $500/MONTH OUTPUT:

BAD (strategy advice — worthless):
"Create a carousel ad showcasing a real-time demo of the product"

GOOD (production brief — worth $500/month):
"4-card carousel. Card 1: Screenshot of product in action with red arrow pointing to key feature. Card 2: Split screen — before (frustration) vs after (result). Card 3: Social proof — quote from user or rating. Card 4: CTA button mockup 'Try Free for 7 Days'. Hook text: 'I used to spend 3 hours on this. Now it takes 10 minutes.' Primary text: 2 sentences max. CTA: 'Learn More'. Based on your top performer (ROAS: 3.2) + {competitorName}'s ad (id: xyz) running 45 days. Budget: $25/day. Kill if CTR < your avg (2.1%) after 3 days or CPA > $45."

Every recommendation you write MUST include:
- **Format**: Static/video/carousel with card-by-card or scene-by-scene specs
- **Written copy**: Actual hook text, primary text, CTA — fully written for the brand. No brackets, no templates.
- **Visual direction**: What the image/video shows. Specific enough for a designer to build without questions.
- **Budget**: "$X/day for Y days"
- **Kill criteria**: Reference YOUR benchmarks — "Kill if CTR < your avg (X%) or CPA > $Y"
- **Client data connection**: "Your top ad (ROAS: X.X) uses similar pattern — doubling down"
- **Competitor reference**: "Modeled after {competitorName}'s ad (id: xyz, N days active, score: X)"
- **A/B variations**: For hooks, always provide 2-3 written-out alternatives

## BRAND CONTEXT:
- Brand Name: {brandName}
- Industry: {industry}
- Top performing value props from your ads: {extractedValueProps}

## VALID COMPETITORS (ONLY USE THESE):
{validCompetitorsList}

CRITICAL: You may ONLY reference competitors from the list above. Do NOT invent or hallucinate competitor names.

## YOUR RAW AD PERFORMANCE DATA:
{clientDataSummary}

## CLIENT'S OWN PERFORMANCE DATA (My Patterns):
{myPatternsData}

## COMPETITOR TRENDS & GAPS:
{trendsData}

## TOP COMPETITOR ADS (with visual context):
{topAdsData}

## BENCHMARK DATA:
{benchmarksData}

## CONFIDENCE LEVEL RULES (MANDATORY):
- "high": 20+ data points on BOTH your side AND competitor side supporting this
- "medium": Data on one side, limited (<10 points) on other side
- "hypothesis": Based on competitor patterns only, needs your testing to validate

## OUTPUT FORMAT

Respond with a JSON object in this EXACT format:

{
  "actionPlan": {
    "thisWeek": {
      "action": "PRODUCTION BRIEF: [format] ad. [Scene/card breakdown]. Hook: '[exact copy]'. Primary text: '[exact copy]'. CTA: '[exact copy]'. Visual: [specific direction]. Based on your top ad (ROAS: X.X) + [competitor]'s ad (id: xyz, N days active).",
      "rationale": "Why this is the priority — connect YOUR performance data + competitor validation",
      "confidence": "high | medium | hypothesis",
      "confidenceReason": "Your data: [specific metrics]. Competitor data: [specific metrics].",
      "budget": "$X/day for Y days",
      "killCriteria": "Kill if CTR < your avg (X%) after Y days or CPA > $Z"
    },
    "nextTwoWeeks": [
      {
        "action": "PRODUCTION BRIEF: [format] ad. [Detailed specs]. Hook: '[exact copy]'. Based on your pattern (ROAS: X.X) + [competitor]'s ad (id: xyz).",
        "testType": "hook | format | angle | creative",
        "confidence": "high | medium | hypothesis",
        "budget": "$X/day for Y days",
        "killCriteria": "Kill if CTR < your avg (X%) after Y days or CPA > $Z"
      }
    ],
    "thisMonth": [
      {
        "action": "Strategic initiative connecting your winners + competitor patterns",
        "strategicGoal": "What this achieves long-term",
        "confidence": "high | medium | hypothesis"
      }
    ]
  },
  "executiveSummary": {
    "topInsight": "Connect YOUR top performer + COMPETITOR validation in one insight",
    "yourStrengths": ["Strength 1 with YOUR specific ROAS/spend data", "Strength 2 with data"],
    "biggestGaps": ["Gap 1 - competitors doing X (N% of them, avg Y days active) you're not", "Gap 2"],
    "quickWins": ["PRODUCTION BRIEF: Specific action based on your winner + competitor pattern", "Another specific action"],
    "benchmarks": [
      {
        "metric": "Days Active",
        "yourValue": 12,
        "competitorAvg": 28,
        "multiplier": 2.3,
        "interpretation": "Competitors run ads 2.3x longer - test longevity on your top performer"
      }
    ]
  },
  "formatStrategy": {
    "summary": "2-3 sentence overview connecting YOUR format performance + competitor patterns",
    "recommendations": [
      {
        "format": "video | static | carousel",
        "action": "scale | test | reduce",
        "rationale": "YOUR data shows X. Competitors confirm with Y. Recommendation: Z.",
        "yourData": "Your ROAS/spend with this format (specific numbers)",
        "competitorData": "X% of top competitor ads use this, averaging Y days active",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "Based on N of your ads + M competitor ads",
        "creativeSpec": "DETAILED SPEC: [For video: Scene 1 (0-3s): [what happens]. Scene 2 (3-8s): [what happens]. For carousel: Card 1: [visual + text]. Card 2: [visual + text]. For static: [exact layout, elements, text placement]]"
      }
    ]
  },
  "hookStrategy": {
    "summary": "2-3 sentence overview connecting YOUR winning hooks + competitor patterns",
    "toTest": [
      {
        "hookTemplate": "WRITE THE EXACT HOOK for {brandName} - no placeholders, no brackets",
        "hookType": "curiosity | transformation | pain_point | social_proof",
        "whyItWorks": "Your top ad with this style: ROAS X.X. Competitors using it: N ads, avg Y days active.",
        "source": "competitor_trend | your_winners | gap_analysis",
        "exampleAds": [{"id": "actual_ad_id_from_data"}],
        "priority": "high | medium | low",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "Your data: [specific]. Competitor data: [specific].",
        "hookVariations": ["Variation 1: exact alternative hook", "Variation 2: exact alternative hook", "Variation 3: exact alternative hook"],
        "primaryText": "Full body copy (2-3 sentences max) to pair with this hook. Written for {brandName}, not a template."
      }
    ],
    "yourWinningHooks": ["Your actual hook that performed well (ROAS: X.X) - keep using this"]
  },
  "competitorGaps": {
    "summary": "2-3 sentence overview of opportunities you're missing",
    "opportunities": [
      {
        "patternName": "Pattern name",
        "description": "What this is and why it works — competitors using it have X days active avg",
        "competitorsUsing": ["Competitor 1", "Competitor 2"],
        "gapSeverity": "critical | moderate | minor",
        "adaptationSuggestion": "PRODUCTION BRIEF: [format] ad. [Detailed specs]. Hook: '[exact copy]'. Visual: [specific direction]. Adapts [competitor]'s pattern (id: xyz) for {brandName}.",
        "exampleAds": [{"id": "actual_ad_id"}],
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "N competitors using this pattern, avg Y days active"
      }
    ]
  },
  "stopDoing": {
    "summary": "Patterns YOUR data shows are underperforming",
    "patterns": [
      {
        "pattern": "What to stop",
        "reason": "Why it's not working — YOUR ROAS data shows underperformance",
        "yourData": "Your specific ROAS/CPA for this pattern (must show underperformance)",
        "competitorComparison": "Competitors avoiding this or doing it differently",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "Based on N of your ads with this pattern showing ROAS below your avg"
      }
    ]
  },
  "topPerformers": {
    "competitorAds": [
      {
        "adId": "actual_ad_id_from_data",
        "competitorName": "Competitor name",
        "whyItWorks": "Specific analysis — N days active, score X, uses [pattern]",
        "stealableElements": ["SPECIFIC: [exact element with how to recreate for {brandName}]", "SPECIFIC: [exact element]"]
      }
    ]
  }
}

## CROSS-SECTION UNIQUENESS (MANDATORY):

Each section must provide DISTINCT value. Never repeat the same recommendation across sections.

- **Action Plan**: The ONE specific creative to build, with full production spec. This is the highest-priority item.
- **Executive Summary → Quick Wins**: Small, fast actions that are DIFFERENT from the Action Plan. Think: copy changes to existing ads, audience adjustments, budget reallocations — NOT new creatives.
- **Format Strategy**: Which FORMATS to prioritize and why. Don't describe specific creatives — describe format-level strategy with data.
- **Hook Strategy**: Specific HOOKS to test — the written copy, not the creative format.
- **Competitor Gaps**: Patterns/approaches you're MISSING entirely — things that require a new creative direction, not variations of what's already in the Action Plan.

If you find yourself writing "create a carousel ad" in more than one section, you're repeating. Each section should make the reader say "I didn't already know this from the previous section."

## CRITICAL RULES

1. **PRODUCTION BRIEFS, NOT ADVICE**: Every action must be executable without follow-up questions
2. **CONNECT BOTH DATA SOURCES**: Every recommendation should cite YOUR metrics + competitor validation
3. **EXACT COPY**: Write the actual hook, primary text, and CTA. No "[insert benefit]" or "[your product]"
4. **VISUAL SPECIFICITY**: "Hero image of product on desk with laptop in background" not "product image"
5. **YOUR BENCHMARKS IN KILL CRITERIA**: Use client's own CTR/CPA averages as thresholds
6. **HOOK VARIATIONS**: Always provide 2-3 written alternatives for A/B testing
7. **STOPDOING MUST USE YOUR DATA**: Only recommend stopping patterns where client ROAS shows underperformance
8. **CONFIDENCE BASED ON DATA VOLUME**: High = 20+ data points both sides. Medium = limited on one side. Hypothesis = competitor only.
9. **MAX 2-3 AD REFERENCES PER RECOMMENDATION**: Reference the 2-3 most relevant competitor ads by ID, not all of them. The UI shows ad thumbnails automatically — your job is to analyze the top examples, not dump a list.

Return 2-3 items per section. Quality over quantity.

## LENGTH CONSTRAINTS (MANDATORY — your response MUST fit within token limits):
- Each string field: MAX 2 sentences (50 words). Be punchy, not verbose.
- "action" fields: MAX 100 words. Include format, hook, CTA, visual — skip filler words.
- "description" fields: MAX 40 words.
- "adaptationSuggestion" fields: MAX 80 words.
- "confidenceReason" fields: MAX 25 words.
- hookVariations: MAX 15 words each.
- primaryText: MAX 30 words.
- Do NOT pad descriptions with restating what was already said. Every word must add information.`;

interface AdSummary {
  id: string;
  competitorName: string;
  format: 'video' | 'static' | 'carousel';
  daysActive: number;
  hookText: string | null;
  headline: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  score: number | null;
  creativeElements: string[];
}

// Summarize client ads directly from the client_ads table
interface ClientAdsSummary {
  totalSpend: number;
  totalRevenue: number;
  avgROAS: number;
  avgCPA: number;
  avgCTR: number;
  adCount: number;
  adsWithSpend: number;
  topPerformers: { name: string; roas: number; spend: number; body: string }[];
  bottomPerformers: { name: string; roas: number; spend: number; body: string }[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function summarizeClientAds(clientAds: any[]): ClientAdsSummary | null {
  if (!clientAds || clientAds.length === 0) return null;

  const totalSpend = clientAds.reduce((s, a) => s + (Number(a.spend) || 0), 0);
  const totalRevenue = clientAds.reduce((s, a) => s + (Number(a.revenue) || 0), 0);
  const totalConversions = clientAds.reduce((s, a) => s + (Number(a.conversions) || 0), 0);
  const avgROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0;
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const totalClicks = clientAds.reduce((s, a) => s + (Number(a.clicks) || 0), 0);
  const totalImpressions = clientAds.reduce((s, a) => s + (Number(a.impressions) || 0), 0);
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const withSpend = clientAds.filter(a => (Number(a.spend) || 0) > 1);
  const sorted = [...withSpend].sort((a, b) => (Number(b.roas) || 0) - (Number(a.roas) || 0));

  const truncateBody = (body: string | null) => {
    if (!body) return '';
    return body.length > 80 ? body.slice(0, 80) + '...' : body;
  };

  const topPerformers = sorted.slice(0, 5).map(a => ({
    name: a.name || 'Untitled',
    roas: Number(a.roas) || 0,
    spend: Number(a.spend) || 0,
    body: truncateBody(a.body),
  }));

  const bottomPerformers = sorted.slice(-5).reverse().map(a => ({
    name: a.name || 'Untitled',
    roas: Number(a.roas) || 0,
    spend: Number(a.spend) || 0,
    body: truncateBody(a.body),
  }));

  return {
    totalSpend,
    totalRevenue,
    avgROAS,
    avgCPA,
    avgCTR,
    adCount: clientAds.length,
    adsWithSpend: withSpend.length,
    topPerformers,
    bottomPerformers,
  };
}

function formatClientAdsSummary(summary: ClientAdsSummary): string {
  let out = `### YOUR AD PERFORMANCE (${summary.adCount} ads, ${summary.adsWithSpend} with spend)\n`;
  out += `- Total Spend: $${summary.totalSpend.toFixed(2)}\n`;
  out += `- Total Revenue: $${summary.totalRevenue.toFixed(2)}\n`;
  out += `- Average ROAS: ${summary.avgROAS.toFixed(2)}x\n`;
  out += `- Average CPA: $${summary.avgCPA.toFixed(2)}\n`;
  out += `- Average CTR: ${summary.avgCTR.toFixed(2)}%\n\n`;

  if (summary.topPerformers.length > 0) {
    out += `**Top Performers (by ROAS):**\n`;
    summary.topPerformers.forEach(a => {
      out += `- "${a.name}" — ROAS: ${a.roas.toFixed(2)}x, Spend: $${a.spend.toFixed(2)}`;
      if (a.body) out += ` | Copy: "${a.body}"`;
      out += '\n';
    });
    out += '\n';
  }

  if (summary.bottomPerformers.length > 0) {
    out += `**Bottom Performers (by ROAS):**\n`;
    summary.bottomPerformers.forEach(a => {
      out += `- "${a.name}" — ROAS: ${a.roas.toFixed(2)}x, Spend: $${a.spend.toFixed(2)}`;
      if (a.body) out += ` | Copy: "${a.body}"`;
      out += '\n';
    });
  }

  return out;
}

// Calculate benchmarks from competitor data
function calculateBenchmarks(
  topAds: AdSummary[],
  myPatternsData: MyPatternAnalysis | null,
  clientAdsSummary?: ClientAdsSummary | null
): Benchmark[] {
  if (topAds.length === 0) return [];

  const avgCompetitorDaysActive = topAds.reduce((s, a) => s + (a.daysActive || 0), 0) / topAds.length;

  const benchmarks: Benchmark[] = [];

  // Always add Days Active benchmark (use estimate if no client data)
  const yourAvgDays = myPatternsData?.adsAnalyzed ? 14 : 0; // 0 means "no data"
  const multiplier = yourAvgDays > 0 ? avgCompetitorDaysActive / yourAvgDays : 0;
  benchmarks.push({
    metric: 'Average Days Active',
    yourValue: yourAvgDays,
    competitorAvg: Math.round(avgCompetitorDaysActive),
    multiplier: Math.round(multiplier * 10) / 10,
    interpretation: yourAvgDays === 0
      ? `Top competitors run ads for ${Math.round(avgCompetitorDaysActive)} days on average`
      : multiplier > 1.5
      ? `Competitors run ads ${multiplier.toFixed(1)}x longer - consider testing longevity`
      : multiplier < 0.7
      ? `You run ads ${(1/multiplier).toFixed(1)}x longer than competitors`
      : 'Similar ad longevity to competitors'
  });

  // ROAS benchmark (from client_ads data)
  if (clientAdsSummary && clientAdsSummary.avgROAS > 0) {
    benchmarks.push({
      metric: 'Average ROAS',
      yourValue: Math.round(clientAdsSummary.avgROAS * 100) / 100,
      competitorAvg: 0, // Competitors don't have ROAS data
      multiplier: 0,
      interpretation: `Your average ROAS is ${clientAdsSummary.avgROAS.toFixed(2)}x across ${clientAdsSummary.adsWithSpend} ads with spend`
    });
  }

  // CTR benchmark (from client_ads data)
  if (clientAdsSummary && clientAdsSummary.avgCTR > 0) {
    benchmarks.push({
      metric: 'Average CTR',
      yourValue: Math.round(clientAdsSummary.avgCTR * 100) / 100,
      competitorAvg: 0,
      multiplier: 0,
      interpretation: `Your average CTR is ${clientAdsSummary.avgCTR.toFixed(2)}% — use this as your kill criteria baseline`
    });
  }

  return benchmarks;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Anthropic API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { brandId, title } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    // Verify brand belongs to user and get additional context
    const { data: brand } = await supabase
      .from('client_brands')
      .select('id, name, industry')
      .eq('id', brandId)
      .eq('user_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found' },
        { status: 404 }
      );
    }

    // 1. Fetch My Patterns (client performance data)
    let myPatternsData: MyPatternAnalysis | null = null;
    let clientAdsAnalyzed = 0;

    try {
      // Check for cached pattern analysis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: patternCache } = await (supabase as any)
        .from('pattern_analyses')
        .select('analysis')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .single();

      if (patternCache?.analysis) {
        myPatternsData = patternCache.analysis as MyPatternAnalysis;
        clientAdsAnalyzed = myPatternsData.adsAnalyzed || 0;
      }
    } catch {
      // No cached patterns - that's ok, continue with competitor data only
    }

    // 1b. Fetch client_ads directly for this brand (don't rely solely on pattern_analyses cache)
    let clientAdsSummary: ClientAdsSummary | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clientAdsData } = await (supabase as any)
        .from('client_ads')
        .select('*')
        .eq('client_brand_id', brandId)
        .eq('user_id', user.id);

      if (clientAdsData && clientAdsData.length > 0) {
        clientAdsSummary = summarizeClientAds(clientAdsData);
      }
    } catch {
      // No client ads - continue with competitor data only
    }

    // 1c. Determine if we're in low-data mode (competitor-focused playbook)
    // Use client_ads data OR pattern_analyses cache — whichever is available
    const effectiveSpend = clientAdsSummary?.totalSpend || myPatternsData?.totalSpend || 0;
    const effectiveAdsCount = clientAdsSummary?.adsWithSpend || myPatternsData?.adsAnalyzed || 0;
    const hasSubstantialClientData = effectiveSpend >= LOW_DATA_THRESHOLD_SPEND && effectiveAdsCount >= LOW_DATA_THRESHOLD_ADS;
    const lowDataMode = !hasSubstantialClientData;

    // 2. Fetch VALID competitor names from competitors table
    // This is the source of truth - only these competitors should appear in the playbook
    const { data: validCompetitors } = await supabase
      .from('competitors')
      .select('name')
      .eq('brand_id', brandId);

    const validCompetitorNames = new Set<string>(
      (validCompetitors || []).map(c => (c.name || '').toLowerCase()).filter(Boolean)
    );
    const validCompetitorList: string[] = (validCompetitors || []).map(c => c.name).filter((n): n is string => !!n);

    console.log(`[Playbook] Brand: ${brand.name}, Valid competitors:`, validCompetitorList);

    // 2b. Fetch Competitor Trends
    let trendsData: DetectedTrend[] = [];
    let trendsCount = 0;

    try {
      const { data: trendCache } = await supabase
        .from('trend_analyses')
        .select('trends')
        .eq('brand_id', brandId)
        .single();

      if (trendCache?.trends) {
        trendsData = trendCache.trends as unknown as DetectedTrend[];
        trendsCount = trendsData.length;
      }
    } catch {
      // No cached trends - that's ok
    }

    // 3. Fetch Top Competitor Ads (expanded query for visuals)
    // First try with is_client_ad filter, fall back to all ads if needed
    let competitorAds = await supabase
      .from('ads')
      .select(`
        id, competitor_name, format, days_active,
        hook_text, headline, primary_text,
        thumbnail_url, video_url,
        scoring, creative_elements
      `)
      .eq('client_brand_id', brandId)
      .eq('is_client_ad', false)
      .order('scoring->final', { ascending: false })
      .limit(30);

    // If no competitor ads found with is_client_ad filter, try without it
    // (some setups may not have this flag properly set)
    if (!competitorAds.data || competitorAds.data.length === 0) {
      competitorAds = await supabase
        .from('ads')
        .select(`
          id, competitor_name, format, days_active,
          hook_text, headline, primary_text,
          thumbnail_url, video_url,
          scoring, creative_elements
        `)
        .eq('client_brand_id', brandId)
        .not('competitor_name', 'ilike', `%${brand.name}%`)
        .order('scoring->final', { ascending: false })
        .limit(30);
    }

    // Also get total competitor count from competitors table for validation
    const { count: totalCompetitorCount } = await supabase
      .from('competitors')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    // Get total ads count for validation
    const { count: totalAdsCount } = await supabase
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('client_brand_id', brandId)
      .eq('is_client_ad', false);

    // Filter ads to ONLY include those from valid competitors
    const filteredAds = (competitorAds.data || []).filter(ad => {
      if (!ad.competitor_name) return false;
      return validCompetitorNames.has(ad.competitor_name.toLowerCase());
    });

    console.log(`[Playbook] Ads before filter: ${competitorAds.data?.length || 0}, after filter: ${filteredAds.length}`);
    console.log(`[Playbook] Competitor names in ads:`, Array.from(new Set(filteredAds.map(a => a.competitor_name))));

    const topAds: AdSummary[] = filteredAds.map(ad => ({
      id: ad.id,
      competitorName: ad.competitor_name,
      format: ad.format as 'video' | 'static' | 'carousel',
      daysActive: ad.days_active,
      hookText: ad.hook_text,
      headline: ad.headline,
      thumbnailUrl: ad.thumbnail_url,
      videoUrl: ad.video_url,
      score: (ad.scoring as { final?: number } | null)?.final || null,
      creativeElements: ad.creative_elements || [],
    }));

    // 3b. Build ad reference map for response enrichment
    const adReferenceMap = new Map<string, AdReference>();
    topAds.forEach(ad => {
      adReferenceMap.set(ad.id, {
        id: ad.id,
        thumbnailUrl: ad.thumbnailUrl || undefined,
        hookText: ad.hookText || undefined,
        headline: ad.headline || undefined,
        competitorName: ad.competitorName,
        format: ad.format,
        daysActive: ad.daysActive,
        score: ad.score || undefined,
      });
    });

    // 3c. Competitor data validation
    // Use both the ads-based count and the competitors table count
    const uniqueCompetitorsFromAds = new Set(topAds.map(ad => ad.competitorName).filter(Boolean));
    const competitorCount = Math.max(uniqueCompetitorsFromAds.size, totalCompetitorCount || 0);
    const adsCount = Math.max(topAds.length, totalAdsCount || 0);

    if (competitorCount < MIN_COMPETITORS && adsCount < MIN_ADS_IF_FEW_COMPETITORS) {
      return NextResponse.json({
        success: false,
        error: 'insufficient_competitor_data',
        details: {
          currentCompetitors: competitorCount,
          requiredCompetitors: MIN_COMPETITORS,
          currentAds: adsCount,
          requiredAds: MIN_ADS_IF_FEW_COMPETITORS,
          message: competitorCount < MIN_COMPETITORS
            ? `Need ${MIN_COMPETITORS - competitorCount} more competitors for real patterns`
            : `Need ${MIN_ADS_IF_FEW_COMPETITORS - adsCount} more competitor ads`
        }
      });
    }

    // 3d. Calculate benchmarks
    const benchmarks = calculateBenchmarks(topAds, myPatternsData, clientAdsSummary);

    // Check if we have enough data
    if (!myPatternsData && !clientAdsSummary && trendsData.length === 0 && topAds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Not enough data to generate a playbook. Please sync your Meta ads or competitor ads first.',
      });
    }

    // 4. Build the prompt
    const myPatternsStr = myPatternsData
      ? JSON.stringify({
          winningPatterns: myPatternsData.winningPatterns,
          losingPatterns: myPatternsData.losingPatterns,
          doubleDown: myPatternsData.doubleDown,
          stopDoing: myPatternsData.stopDoing,
          testNext: myPatternsData.testNext,
          summary: myPatternsData.summary,
          adsAnalyzed: myPatternsData.adsAnalyzed,
          accountAvgRoas: myPatternsData.accountAvgRoas,
        }, null, 2)
      : 'No client performance data available (Meta not connected or no ads synced)';

    const trendsStr = trendsData.length > 0
      ? JSON.stringify(trendsData.map(t => ({
          trendName: t.trendName,
          category: t.category,
          description: t.description,
          evidence: t.evidence,
          whyItWorks: t.whyItWorks,
          hasGap: t.hasGap,
          gapDetails: t.gapDetails,
          adaptationRecommendation: t.adaptationRecommendation,
        })), null, 2)
      : 'No competitor trend data available';

    // Include visual context in ads data
    const topAdsStr = topAds.length > 0
      ? JSON.stringify(topAds.map(ad => ({
          id: ad.id,
          competitorName: ad.competitorName,
          format: ad.format,
          daysActive: ad.daysActive,
          hookText: ad.hookText,
          headline: ad.headline,
          score: ad.score,
          creativeElements: ad.creativeElements,
          hasThumbnail: !!ad.thumbnailUrl,
          hasVideo: !!ad.videoUrl,
        })), null, 2)
      : 'No competitor ads available';

    // Extract value props from winning patterns
    const extractedValueProps = myPatternsData?.winningPatterns
      ?.slice(0, 3)
      .map(p => p.name)
      .join(', ') || 'Not yet identified';

    const benchmarksStr = JSON.stringify(benchmarks, null, 2);

    // Build client data summary string (always available, regardless of low-data mode)
    const clientDataStr = clientAdsSummary
      ? formatClientAdsSummary(clientAdsSummary)
      : 'No client ad data available';

    // Build valid competitors list string for prompt
    const validCompetitorsStr = validCompetitorList.length > 0
      ? validCompetitorList.map((name, i) => `${i + 1}. ${name}`).join('\n')
      : 'No competitors tracked yet';

    console.log(`[Playbook] Passing ${validCompetitorList.length} valid competitors to Claude:`, validCompetitorList);
    console.log(`[Playbook] Client ads summary: ${clientAdsSummary ? `${clientAdsSummary.adCount} ads, $${clientAdsSummary.totalSpend.toFixed(2)} spend` : 'none'}`);
    console.log(`[Playbook] Low data mode: ${lowDataMode} (spend: $${effectiveSpend.toFixed(2)}, ads: ${effectiveAdsCount})`);

    // Select prompt based on data availability
    const basePrompt = lowDataMode ? LOW_DATA_PLAYBOOK_PROMPT : PLAYBOOK_SYNTHESIS_PROMPT;

    let prompt = basePrompt
      .replace('{brandName}', brand.name)
      .replace(/\{brandName\}/g, brand.name) // Replace all occurrences
      .replace('{industry}', brand.industry || 'Not specified')
      .replace('{clientDataSummary}', clientDataStr) // Always inject client data
      .replace('{validCompetitorsList}', validCompetitorsStr)
      .replace('{trendsData}', trendsStr)
      .replace('{topAdsData}', topAdsStr)
      .replace('{benchmarksData}', benchmarksStr);

    // Include full client data placeholders for full data mode
    if (!lowDataMode) {
      prompt = prompt
        .replace('{extractedValueProps}', extractedValueProps)
        .replace('{myPatternsData}', myPatternsStr);
    }

    // 5. Call Claude Sonnet (streaming required for large max_tokens)
    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16384,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Collect streamed response
    const message = await stream.finalMessage();

    // Extract text from response
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // 6. Parse the JSON response
    let jsonStr = text;
    // Try to extract JSON from markdown code blocks first
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    } else {
      // Claude often returns clean JSON without code blocks — try parsing directly
      jsonStr = text.trim();
    }

    let playbookContent: PlaybookContent;
    try {
      const parsed = JSON.parse(jsonStr);

      // Validate and fill missing fields that Claude sometimes omits
      // Action Plan: Ensure budget and killCriteria exist
      if (parsed.actionPlan?.thisWeek) {
        if (!parsed.actionPlan.thisWeek.budget) {
          parsed.actionPlan.thisWeek.budget = '$50-100/day for 7 days';
        }
        if (!parsed.actionPlan.thisWeek.killCriteria) {
          parsed.actionPlan.thisWeek.killCriteria = 'Kill if CTR < 1% after 3 days or CPA > 2x target';
        }
      }
      if (parsed.actionPlan?.nextTwoWeeks) {
        parsed.actionPlan.nextTwoWeeks = parsed.actionPlan.nextTwoWeeks.map((item: { budget?: string; killCriteria?: string }) => ({
          ...item,
          budget: item.budget || '$50-100/day for 7 days',
          killCriteria: item.killCriteria || 'Kill if CTR < 1% after 3 days or CPA > 2x target',
        }));
      }

      // Hook Strategy: Ensure hookVariations and primaryText exist
      if (parsed.hookStrategy?.toTest) {
        parsed.hookStrategy.toTest = parsed.hookStrategy.toTest.map((hook: { hook?: string; hookVariations?: string[]; primaryText?: string }) => ({
          ...hook,
          hookVariations: hook.hookVariations?.length ? hook.hookVariations : [
            `Alternative: ${hook.hook || 'Try a different angle'}`,
            `Variation: Test with urgency or social proof`,
          ],
          primaryText: hook.primaryText || 'Test this hook with compelling body copy that reinforces the pain point and presents your solution.',
        }));
      }

      // Format Strategy: Ensure creativeSpec exists
      if (parsed.formatStrategy?.recommendations) {
        parsed.formatStrategy.recommendations = parsed.formatStrategy.recommendations.map((rec: { format?: string; creativeSpec?: string }) => ({
          ...rec,
          creativeSpec: rec.creativeSpec || `Production brief for ${rec.format || 'this format'}: Focus on clear visuals, strong opening hook, and direct CTA. Keep messaging concise and benefit-focused.`,
        }));
      }

      // Log available ad IDs for debugging
      const availableAdIds = Array.from(adReferenceMap.keys());
      console.log(`[Playbook] Available ad IDs in map (${availableAdIds.length}):`, availableAdIds.slice(0, 10));

      // Enrich ad references with visual data from our map
      const enrichAdReferences = (adRefs: { id?: string }[] | undefined): AdReference[] => {
        if (!adRefs || adRefs.length === 0) return [];

        const enriched = adRefs.map(ref => {
          if (ref.id && adReferenceMap.has(ref.id)) {
            console.log(`[Playbook] Enriched ad ${ref.id} with thumbnail`);
            return adReferenceMap.get(ref.id)!;
          }
          console.log(`[Playbook] Ad ID ${ref.id} not found in map`);
          return ref as AdReference;
        });

        return enriched;
      };

      // Track used ads across sections to prevent repetition
      const usedAdIds = new Set<string>();

      // If Claude didn't return valid ad references, inject the top ads directly
      const injectTopAdsIfEmpty = (adRefs: AdReference[], preferredFormat?: string): AdReference[] => {
        if (adRefs.length > 0 && adRefs.some(a => a.thumbnailUrl)) {
          // Mark these ads as used
          adRefs.forEach(a => usedAdIds.add(a.id));
          return adRefs;
        }

        // Filter by format if specified, then exclude already-used ads
        let availableAds = topAds.filter(ad => !usedAdIds.has(ad.id));
        if (preferredFormat) {
          const formatFiltered = availableAds.filter(ad => ad.format === preferredFormat);
          if (formatFiltered.length > 0) availableAds = formatFiltered;
        }

        const selected = availableAds.slice(0, 4).map(ad => adReferenceMap.get(ad.id)!).filter(Boolean);
        selected.forEach(a => usedAdIds.add(a.id));

        if (selected.length === 0 && availableAds.length === 0) {
          // All ads used - cycle back to show top 2 ads
          return topAds.slice(0, 2).map(ad => adReferenceMap.get(ad.id)!).filter(Boolean);
        }

        return selected;
      };

      // Enrich format strategy - pass format for filtering
      if (parsed.formatStrategy?.recommendations) {
        parsed.formatStrategy.recommendations = parsed.formatStrategy.recommendations.map((rec: { format?: string; exampleAds?: { id?: string }[] }) => ({
          ...rec,
          exampleAds: injectTopAdsIfEmpty(enrichAdReferences(rec.exampleAds), rec.format),
        }));
      }

      // Enrich hook strategy
      if (parsed.hookStrategy?.toTest) {
        parsed.hookStrategy.toTest = parsed.hookStrategy.toTest.map((hook: { exampleAds?: { id?: string }[] }) => ({
          ...hook,
          exampleAds: injectTopAdsIfEmpty(enrichAdReferences(hook.exampleAds)),
        }));
      }

      // Enrich competitor gaps
      if (parsed.competitorGaps?.opportunities) {
        parsed.competitorGaps.opportunities = parsed.competitorGaps.opportunities.map((opp: { exampleAds?: { id?: string }[] }) => ({
          ...opp,
          exampleAds: injectTopAdsIfEmpty(enrichAdReferences(opp.exampleAds)),
        }));
      }

      // Enrich top performers with deduplication
      if (parsed.topPerformers?.competitorAds) {
        parsed.topPerformers.competitorAds = parsed.topPerformers.competitorAds.map((ad: { adId?: string }) => {
          // Try to use the referenced ad
          if (ad.adId && adReferenceMap.has(ad.adId)) {
            usedAdIds.add(ad.adId);
            return { ...ad, adReference: adReferenceMap.get(ad.adId) };
          }
          // Fallback: find first unused ad
          const unusedAd = topAds.find(a => !usedAdIds.has(a.id));
          if (unusedAd) {
            usedAdIds.add(unusedAd.id);
            return { ...ad, adReference: adReferenceMap.get(unusedAd.id) };
          }
          // Last resort: use first ad
          return { ...ad, adReference: topAds[0] ? adReferenceMap.get(topAds[0].id) : undefined };
        });
      }

      // Add data snapshot AND inject calculated benchmarks
      playbookContent = {
        ...parsed,
        executiveSummary: {
          ...parsed.executiveSummary,
          benchmarks: benchmarks,  // Override with our calculated benchmarks
        },
        dataSnapshot: {
          myPatternsIncluded: !!myPatternsData && !lowDataMode,
          clientAdsIncluded: !!clientAdsSummary,
          clientAdsAnalyzed: clientAdsSummary?.adCount || clientAdsAnalyzed,
          competitorAdsAnalyzed: topAds.length,
          trendsIncorporated: trendsCount,
          generatedAt: new Date().toISOString(),
          lowDataMode,
        },
      };

      // Override Claude's benchmarks with our calculated ones
      // LLMs frequently put competitor values in the wrong fields
      if (playbookContent.executiveSummary) {
        playbookContent.executiveSummary.benchmarks = benchmarks;
      }
    } catch {
      console.error('Failed to parse Claude response:', text);
      return NextResponse.json(
        { success: false, error: 'Failed to parse playbook response' },
        { status: 500 }
      );
    }

    // 7. Store in database
    const playbookTitle = title || `${brand.name} Creative Playbook - ${new Date().toLocaleDateString()}`;

    const { data: playbook, error: insertError } = await supabase
      .from('playbooks')
      .insert({
        brand_id: brandId,
        user_id: user.id,
        title: playbookTitle,
        my_patterns_included: !!myPatternsData,
        competitor_trends_count: trendsCount,
        competitor_ads_count: topAds.length,
        content: playbookContent as unknown as Json,
        status: 'completed',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save playbook:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save playbook' },
        { status: 500 }
      );
    }

    const response_data: GeneratePlaybookResponse = {
      success: true,
      playbook: {
        ...playbook,
        content: playbookContent,
        status: playbook.status as 'generating' | 'completed' | 'failed',
      },
    };

    return NextResponse.json(response_data);
  } catch (error) {
    console.error('Error generating playbook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
