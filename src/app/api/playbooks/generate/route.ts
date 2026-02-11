import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { PlaybookContent, GeneratePlaybookResponse, AdReference, Benchmark } from '@/types/playbook';
import { MyPatternAnalysis } from '@/types/meta';
import { DetectedTrend } from '@/types/analysis';
import { Json } from '@/types/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Validation thresholds
const MIN_COMPETITORS = 3;
const MIN_ADS_IF_FEW_COMPETITORS = 50;
// Low data mode: when client has little/no performance data
const LOW_DATA_THRESHOLD_SPEND = 100;
const LOW_DATA_THRESHOLD_ADS = 5;

// Low-data mode prompt - competitor-focused, all hypothesis confidence
const LOW_DATA_PLAYBOOK_PROMPT = `You are a $500/hr creative strategist creating a COMPETITOR-FOCUSED creative strategy brief.

IMPORTANT: The client has LIMITED OR NO performance data. This is a competitor intelligence playbook.
- ALL recommendations must be marked as "hypothesis" confidence
- Be explicit that these are patterns to TEST, not proven strategies
- DO NOT make generic obvious statements like "stop running ads with no conversions"
- DO give specific, actionable insights based on what's working for competitors

## BRAND CONTEXT:
- Brand Name: {brandName}
- Industry: {industry}
- Client Data Status: Limited or no performance data available

## VALID COMPETITORS (ONLY USE THESE):
{validCompetitorsList}

CRITICAL: You may ONLY reference competitors from the list above. Do NOT invent or hallucinate competitor names.
If a competitor name is not in the list, DO NOT mention it.

## COMPETITOR TRENDS & GAPS:
{trendsData}

## TOP COMPETITOR ADS (with visual context):
{topAdsData}

## COMPETITOR BENCHMARKS:
{benchmarksData}

## CRITICAL RULES FOR LOW-DATA MODE:

1. **ALL CONFIDENCE = HYPOTHESIS**: Every single recommendation must have confidence: "hypothesis"
2. **BE SPECIFIC**: Instead of "use video", say "{competitorName}'s top 3 ads all open with a question hook under 2 seconds — test this format"
3. **REFERENCE ACTUAL ADS**: Include ad IDs so we can show thumbnails. Say "See {competitorName}'s ad (id: xyz) for this pattern"
4. **PRIORITIZE BY VELOCITY**: Recommend testing patterns from ads with highest days_active first (they're proven to work longer)
5. **NO FAKE CLIENT DATA**: Don't pretend you have performance data. In "yourData" fields, write "No data yet - test this"
6. **ACTIONABLE OVER OBVIOUS**: Skip generic advice. Give specific creative directions based on competitor analysis.

## OUTPUT FORMAT

Respond with a JSON object in this EXACT format:

{
  "actionPlan": {
    "thisWeek": {
      "action": "The ONE most impactful test to run based on competitor patterns - be specific (e.g., 'Create a video ad that opens with a question hook like {competitorName}'s top performer')",
      "rationale": "Why this pattern is working for competitors (reference specific ads and metrics)",
      "confidence": "hypothesis",
      "confidenceReason": "Based on competitor patterns only — needs testing with your audience"
    },
    "nextTwoWeeks": [
      {
        "action": "Specific test based on competitor pattern",
        "testType": "hook | format | angle | creative",
        "confidence": "hypothesis"
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
    "yourStrengths": ["Cannot assess without performance data - focus on competitor learnings below"],
    "biggestGaps": ["Competitor pattern 1 to test", "Competitor pattern 2 to test"],
    "quickWins": ["Specific action based on competitor X's approach", "Another specific action"],
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
        "confidenceReason": "Based on competitor patterns — test with your audience"
      }
    ]
  },
  "hookStrategy": {
    "summary": "Hook patterns working for competitors",
    "toTest": [
      {
        "hookTemplate": "WRITE AN ACTUAL HOOK for {brandName} inspired by competitor patterns - no placeholders",
        "hookType": "curiosity | transformation | pain_point | social_proof",
        "whyItWorks": "Why this hook style works for competitors (reference specific ads)",
        "source": "competitor_trend",
        "exampleAds": [{"id": "actual_ad_id_from_data"}],
        "priority": "high | medium | low",
        "confidence": "hypothesis",
        "confidenceReason": "Modeled after {competitorName}'s successful ads — test with your audience"
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
        "adaptationSuggestion": "Specific way to adapt for {brandName}",
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
        "stealableElements": ["Specific element 1", "Specific element 2"]
      }
    ]
  }
}

## GUIDELINES

1. **EVERY CONFIDENCE = HYPOTHESIS**: No exceptions in low-data mode
2. **REFERENCE REAL ADS**: Use actual ad IDs from the data so we can show visuals
3. **BE SPECIFIC**: "{CompetitorName}'s top ad runs 45 days with a transformation hook" not "use transformation hooks"
4. **PRIORITIZE BY VELOCITY**: Ads with more days_active are proven performers - prioritize those patterns
5. **NO GENERIC ADVICE**: Every recommendation should reference specific competitor data
6. **LEAVE stopDoing EMPTY**: Can't tell them what to stop without their data

Return 3-5 items per section. Quality over quantity.`;

const PLAYBOOK_SYNTHESIS_PROMPT = `You are a $500/hr creative strategist creating a premium creative strategy brief.

## BRAND CONTEXT:
- Brand Name: {brandName}
- Industry: {industry}
- Top performing value props from your ads: {extractedValueProps}

## VALID COMPETITORS (ONLY USE THESE):
{validCompetitorsList}

CRITICAL: You may ONLY reference competitors from the list above. Do NOT invent or hallucinate competitor names.
If a competitor name is not in the list, DO NOT mention it.

## CLIENT'S OWN PERFORMANCE DATA (My Patterns):
{myPatternsData}

## COMPETITOR TRENDS & GAPS:
{trendsData}

## TOP COMPETITOR ADS (with visual context):
{topAdsData}

## BENCHMARK DATA:
{benchmarksData}

## CONFIDENCE LEVEL RULES (MANDATORY):
Every recommendation MUST include a confidence level with explanation:
- "high": 20+ data points on BOTH your side AND competitor side supporting this
- "medium": Data on one side, limited (<10 points) on other side
- "hypothesis": Based on competitor patterns only, needs your testing to validate

## HOOK WRITING RULES:
Write hooks FOR this specific brand, not templates:
- BAD: "This is the #1 tool for [benefit]"
- GOOD (if brand is "Stash"): "This is the #1 tool for saving YouTube insights you'll actually revisit"
Use actual product name, actual benefit, actual audience. No brackets or placeholders.

## OUTPUT FORMAT

Respond with a JSON object in this EXACT format:

{
  "actionPlan": {
    "thisWeek": {
      "action": "The ONE most impactful action to take this week - specific and concrete",
      "rationale": "Why this is the priority based on the data",
      "confidence": "high | medium | hypothesis",
      "confidenceReason": "Explain what data supports this confidence level"
    },
    "nextTwoWeeks": [
      {
        "action": "Specific test to run",
        "testType": "hook | format | angle | creative",
        "confidence": "high | medium | hypothesis"
      }
    ],
    "thisMonth": [
      {
        "action": "Strategic initiative",
        "strategicGoal": "What this achieves long-term",
        "confidence": "high | medium | hypothesis"
      }
    ]
  },
  "executiveSummary": {
    "topInsight": "The single most important insight (1-2 sentences with data)",
    "yourStrengths": ["Strength 1 with specific data", "Strength 2 with data"],
    "biggestGaps": ["Gap 1 - competitors doing X (N% of them) you're not", "Gap 2"],
    "quickWins": ["Immediate action 1", "Immediate action 2"],
    "benchmarks": [
      {
        "metric": "Days Active",
        "yourValue": 12,
        "competitorAvg": 28,
        "multiplier": 2.3,
        "interpretation": "Competitors run ads 2.3x longer - test longevity"
      }
    ]
  },
  "formatStrategy": {
    "summary": "2-3 sentence overview based on benchmarks",
    "recommendations": [
      {
        "format": "video | static | carousel",
        "action": "scale | test | reduce",
        "rationale": "Why this recommendation based on data",
        "yourData": "Your performance with this format",
        "competitorData": "What competitors are doing (include %)",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "e.g., 'Based on 45 competitor ads and 12 of your ads'"
      }
    ]
  },
  "hookStrategy": {
    "summary": "2-3 sentence overview",
    "toTest": [
      {
        "hookTemplate": "WRITE THE ACTUAL HOOK for {brandName} - no brackets or placeholders",
        "hookType": "curiosity | transformation | pain_point | social_proof",
        "whyItWorks": "Psychology + data backing",
        "source": "competitor_trend | your_winners | gap_analysis",
        "exampleAds": [],
        "priority": "high | medium | low",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "What data supports this hook style"
      }
    ],
    "yourWinningHooks": ["Hook pattern you should keep using"]
  },
  "competitorGaps": {
    "summary": "2-3 sentence overview",
    "opportunities": [
      {
        "patternName": "Name of the pattern",
        "description": "What this is and why it works",
        "competitorsUsing": ["Competitor 1", "Competitor 2"],
        "gapSeverity": "critical | moderate | minor",
        "adaptationSuggestion": "Specific way to adapt for {brandName}",
        "exampleAds": [],
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "Data supporting this gap analysis"
      }
    ]
  },
  "stopDoing": {
    "summary": "2-3 sentence overview",
    "patterns": [
      {
        "pattern": "What to stop",
        "reason": "Why it's not working",
        "yourData": "Your performance showing this",
        "competitorComparison": "How competitors differ",
        "confidence": "high | medium | hypothesis",
        "confidenceReason": "Data supporting this recommendation"
      }
    ]
  },
  "topPerformers": {
    "competitorAds": [
      {
        "adId": "ad_id",
        "competitorName": "Competitor name",
        "whyItWorks": "What makes this effective",
        "stealableElements": ["Element 1", "Element 2"]
      }
    ]
  }
}

## GUIDELINES

1. **CONFIDENCE IS MANDATORY**: Every recommendation needs confidence + reason
2. **NO PLACEHOLDERS**: Write actual copy for hooks, not "[brand] does [thing]"
3. **USE BENCHMARKS**: Reference multipliers like "2.3x longer" not just "longer"
4. **ACTION PLAN FIRST**: The thisWeek action should be the single highest-impact item
5. **BE SPECIFIC**: Use percentages, counts, and ad IDs from the data
6. **BE HONEST**: If data is limited, use "hypothesis" confidence and say so

Return 3-5 items per section. Quality over quantity.`;

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

// Calculate benchmarks from competitor data
function calculateBenchmarks(
  topAds: AdSummary[],
  myPatternsData: MyPatternAnalysis | null
): Benchmark[] {
  if (topAds.length === 0) return [];

  const avgCompetitorDaysActive = topAds.reduce((s, a) => s + (a.daysActive || 0), 0) / topAds.length;
  const avgCompetitorScore = topAds.reduce((s, a) => s + (a.score || 0), 0) / topAds.length;
  const videoPercentage = (topAds.filter(a => a.format === 'video').length / topAds.length) * 100;
  const staticPercentage = (topAds.filter(a => a.format === 'static').length / topAds.length) * 100;

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

  // Video percentage benchmark
  benchmarks.push({
    metric: 'Video Ad Usage',
    yourValue: myPatternsData?.winningPatterns?.find(p => p.name.toLowerCase().includes('video'))?.avgRoas || 0,
    competitorAvg: Math.round(videoPercentage),
    multiplier: 0,
    interpretation: videoPercentage > 60
      ? `${Math.round(videoPercentage)}% of top competitor ads are video`
      : `Competitors split between video (${Math.round(videoPercentage)}%) and static (${Math.round(staticPercentage)}%)`
  });

  // Score benchmark
  if (avgCompetitorScore > 0) {
    benchmarks.push({
      metric: 'Ad Score',
      yourValue: 0,
      competitorAvg: Math.round(avgCompetitorScore),
      multiplier: 0,
      interpretation: `Top competitor ads average ${Math.round(avgCompetitorScore)} score`
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
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured' },
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

    // 1b. Determine if we're in low-data mode (competitor-focused playbook)
    const totalSpend = myPatternsData?.totalSpend || 0;
    const adsAnalyzed = myPatternsData?.adsAnalyzed || 0;
    const hasSubstantialClientData = totalSpend >= LOW_DATA_THRESHOLD_SPEND && adsAnalyzed >= LOW_DATA_THRESHOLD_ADS;
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
    const benchmarks = calculateBenchmarks(topAds, myPatternsData);

    // Check if we have enough data
    if (!myPatternsData && trendsData.length === 0 && topAds.length === 0) {
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

    // Build valid competitors list string for prompt
    const validCompetitorsStr = validCompetitorList.length > 0
      ? validCompetitorList.map((name, i) => `${i + 1}. ${name}`).join('\n')
      : 'No competitors tracked yet';

    console.log(`[Playbook] Passing ${validCompetitorList.length} valid competitors to Gemini:`, validCompetitorList);

    // Select prompt based on data availability
    const basePrompt = lowDataMode ? LOW_DATA_PLAYBOOK_PROMPT : PLAYBOOK_SYNTHESIS_PROMPT;

    let prompt = basePrompt
      .replace('{brandName}', brand.name)
      .replace(/\{brandName\}/g, brand.name) // Replace all occurrences
      .replace('{industry}', brand.industry || 'Not specified')
      .replace('{validCompetitorsList}', validCompetitorsStr)
      .replace('{trendsData}', trendsStr)
      .replace('{topAdsData}', topAdsStr)
      .replace('{benchmarksData}', benchmarksStr);

    // Only include client data placeholders for full data mode
    if (!lowDataMode) {
      prompt = prompt
        .replace('{extractedValueProps}', extractedValueProps)
        .replace('{myPatternsData}', myPatternsStr);
    }

    // 5. Call Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // 6. Parse the JSON response
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let playbookContent: PlaybookContent;
    try {
      const parsed = JSON.parse(jsonStr);

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

      // If Gemini didn't return valid ad references, inject the top ads directly
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
          clientAdsAnalyzed,
          competitorAdsAnalyzed: topAds.length,
          trendsIncorporated: trendsCount,
          generatedAt: new Date().toISOString(),
          lowDataMode,
        },
      };
    } catch {
      console.error('Failed to parse Gemini response:', text);
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
