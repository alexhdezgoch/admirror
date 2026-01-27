import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TrendAnalysisRequest, DetectedTrend, TrendAnalysisSummary, AdAnalysis } from '@/types/analysis';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const TREND_DETECTION_PROMPT = `You are a creative strategist analyzing Meta ad campaigns to identify emerging trends.

You have access to detailed AI analysis for top-performing ads. Use this rich data to identify patterns.

Analyze the following ads and identify 3-5 EMERGING creative trends. Focus on patterns that are:
1. Present in multiple ads (at least 2)
2. More common in recent/high-performing ads
3. Actionable for creative teams

AD DATA (includes AI-analyzed insights where available):
{adData}

TREND CATEGORIES TO ANALYZE:
1. Visual Style - Design aesthetics, typography, layout patterns, colors mentioned in analyses
2. Copy Style - Tone, length, structure, emoji usage, hooks (use hookAnalysis insights)
3. Color - Dominant colors, combinations, contrast usage (from visual analysis)
4. Seasonal - Holiday themes, time-based urgency, seasonal messaging
5. Storytelling - Narrative approach, emotional appeals, problem-solution (use creativeBlueprint)
6. Format - Video vs static trends, pacing styles, scene structures (use videoMetadata)
7. Hormozi Value Equation - Patterns in dreamOutcome, likelihood, timeDelay, effortSacrifice scores
8. Hook Types - Patterns in Speed-Focused, Trust-Focused, Low-Friction, Outcome-Focused hooks

PRIORITIZATION RULES:
- Weight ads from last 30 days more heavily (check daysActive)
- High-performing ads (score >= 40) carry more weight
- Ads with AI analysis have richer insights - use them!
- Look for patterns that are NEW or GROWING, not just common
- Pay special attention to Hormozi scores - high valueEquation scores indicate winning formulas

CRITICAL: INDUSTRY TREND VALIDATION
- A pattern is ONLY a trend if it appears in ads from 2+ DIFFERENT competitors
- If a pattern only appears in one competitor's ads, it's their strategy, NOT an industry trend
- Always verify competitor diversity before including a trend
- Include competitorCount and competitorNames in your evidence

Return a JSON object with this exact structure:
{
  "trends": [
    {
      "trendName": "Short, catchy name for the trend",
      "category": "Visual | Copy | Color | Seasonal | Storytelling | Format | Hormozi | Hook",
      "description": "2-3 sentences describing the trend in detail",
      "evidence": {
        "adCount": <number of ads showing this trend>,
        "competitorCount": <number of DIFFERENT competitors showing this pattern - MUST be >= 2>,
        "competitorNames": ["list", "of", "competitor", "names"],
        "avgScore": <average score of ads with this trend>,
        "sampleAdIds": ["ad_id_1", "ad_id_2", "ad_id_3"]
      },
      "whyItWorks": "1-2 sentences on the psychology/strategy behind why this trend is effective",
      "recommendedAction": "Specific, actionable advice on how to apply this trend",
      "recencyScore": <1-10, how recent/emerging is this trend? 10 = very recent>
    }
  ]
}

Return 3-5 trends, sorted by recencyScore (highest first). Be specific and actionable.`;

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TrendAnalysisRequest = await request.json();

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    // Validate request
    if (!body.brandId || !body.ads || body.ads.length === 0) {
      return NextResponse.json(
        { success: false, error: 'brandId and at least one ad are required' },
        { status: 400 }
      );
    }

    // Fetch client's own ads for gap analysis
    const { data: clientAds } = await supabase
      .from('ads')
      .select('*')
      .eq('client_brand_id', body.brandId)
      .eq('is_client_ad', true)
      .order('scoring->final', { ascending: false })
      .limit(30);

    const hasClientAds = clientAds && clientAds.length > 0;

    // Build client ads summary for the prompt
    let clientAdsSummary = '';
    if (hasClientAds) {
      const topClientAds = clientAds.slice(0, 10).map((ad: Record<string, unknown>) => {
        const scoring = ad.scoring as Record<string, unknown> | null;
        const elements = ad.creative_elements as string[] | null;
        return {
          hookText: (ad.hook_text as string) || null,
          primaryText: (ad.primary_text as string) || null,
          headline: (ad.headline as string) || null,
          cta: (ad.cta as string) || null,
          creativeElements: elements || [],
          format: (ad.format as string) || 'unknown',
          daysActive: ad.days_active,
          score: scoring?.final || null,
        };
      });

      clientAdsSummary = `
CLIENT'S OWN ADS (${clientAds.length} total, top 10 by performance shown):
${JSON.stringify(topClientAds, null, 2)}
`;
    }

    // Fetch cached AI analyses for these ads
    const adIds = body.ads.map(ad => ad.id);

    const { data: analysesData } = await supabase
      .from('ad_analyses')
      .select('ad_id, analysis')
      .in('ad_id', adIds);

    // Create a map of ad_id to analysis
    const analysisMap = new Map<string, AdAnalysis>();
    analysesData?.forEach(item => {
      analysisMap.set(item.ad_id, item.analysis as unknown as AdAnalysis);
    });

    console.log(`[Trends] Found ${analysisMap.size} cached AI analyses for ${adIds.length} ads`);

    // Prepare ad data for the prompt with AI analysis insights
    const adData = body.ads.map(ad => {
      const analysis = analysisMap.get(ad.id);

      // Base ad data
      const baseData: Record<string, unknown> = {
        id: ad.id,
        competitor: ad.competitorName,
        format: ad.format,
        daysActive: ad.daysActive,
        score: ad.score,
        hook: ad.hookText || 'N/A',
        primaryText: ad.primaryText?.substring(0, 200) || 'N/A',
        launchDate: ad.launchDate,
        elements: ad.creativeElements.join(', ') || 'N/A',
        hasAIAnalysis: !!analysis
      };

      // Enrich with AI analysis if available
      if (analysis) {
        baseData.aiInsights = {
          hookAnalysis: analysis.hookAnalysis ? {
            description: analysis.hookAnalysis.description,
            whyItWorks: analysis.hookAnalysis.whyItWorks
          } : null,
          whyItWon: analysis.whyItWon ? {
            summary: analysis.whyItWon.summary,
            keyFactors: analysis.whyItWon.keyFactors
          } : null,
          creativeBlueprint: analysis.creativeBlueprint ? {
            openingHook: analysis.creativeBlueprint.openingHook,
            storytellingStructure: analysis.creativeBlueprint.storytellingStructure,
            visualStyle: analysis.creativeBlueprint.visualStyle,
            pacing: analysis.creativeBlueprint.pacing
          } : null,
          hormoziScores: analysis.hormoziScores ? {
            dreamOutcome: analysis.hormoziScores.dreamOutcome,
            likelihood: analysis.hormoziScores.likelihood,
            timeDelay: analysis.hormoziScores.timeDelay,
            effortSacrifice: analysis.hormoziScores.effortSacrifice,
            valueEquation: analysis.hormoziScores.valueEquation,
            hookType: analysis.hormoziScores.hookType
          } : null,
          videoMetadata: analysis.videoMetadata ? {
            primaryFormat: analysis.videoMetadata.primaryFormat,
            pacingStyle: analysis.videoMetadata.pacingStyle,
            sceneCount: analysis.videoMetadata.sceneCount
          } : null
        };
      }

      return baseData;
    });

    let prompt = TREND_DETECTION_PROMPT.replace('{adData}', JSON.stringify(adData, null, 2));

    // If client ads exist, inject gap analysis instructions
    if (hasClientAds) {
      const gapInstructions = `

${clientAdsSummary}

ADDITIONAL INSTRUCTIONS — CLIENT GAP ANALYSIS:
First, study the client's ads above to understand their BRAND IDENTITY:
- Voice & tone (formal/casual, playful/serious, technical/simple)
- Messaging patterns (what benefits they emphasize, how they position their product)
- Hook style (question-based, stat-based, story-based, etc.)
- Creative preferences (formats, visual elements, CTAs)

For EACH trend you identify, include:
- "hasGap": true/false — does the client have ads using this pattern? Compare against the client's own ads above.
- "clientGapAnalysis": a 1-2 sentence explanation. If gap=true, explain what the client is missing. If gap=false, explain how their ads match.
- "adaptationRecommendation": Give SPECIFIC, ACTIONABLE advice grounded in the client's brand identity. Reference their actual ad copy, hooks, or messaging style. Suggest 1-2 concrete ad concepts (e.g. hook ideas, angles, or copy snippets) that apply this trend while staying true to the client's voice and positioning.
- "matchingClientAdId": if gap=false and a client ad matches, include its hook text snippet (or null).
- "gapDetails": an object with:
  - "severity": "critical" (client has zero presence in this pattern), "moderate" (partial/weak presence), or "minor" (close match, small tweaks needed)
  - "missingElements": array of specific things the client is missing, e.g. ["video format", "curiosity gap hooks", "bold color palette"]
  - "competitorsDoingItWell": array of competitor names who excel at this trend and should be studied
  - "clientStrengths": (optional) what the client already does well related to this trend, even if there's a gap

Add these fields to each trend object in the JSON response.`;

      prompt += gapInstructions;
    }

    // Get the model - use gemini-2.0-flash for better rate limits
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let analysisData;
    try {
      analysisData = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json(
        { success: false, error: 'Failed to parse trend analysis response' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const recentAds = body.ads.filter(ad => ad.daysActive <= 30);
    const summary: TrendAnalysisSummary = {
      totalAdsAnalyzed: body.ads.length,
      recentAds: recentAds.length,
      avgRecentScore: recentAds.length > 0
        ? Math.round(recentAds.reduce((sum, ad) => sum + ad.score, 0) / recentAds.length)
        : 0
    };

    // Create map from input ads for server-side validation
    const adIdToCompetitor = new Map<string, string>();
    body.ads.forEach(ad => {
      adIdToCompetitor.set(ad.id, ad.competitorName);
    });

    // Validate and clean up trends - SERVER-SIDE validate competitor count
    const trends: DetectedTrend[] = (analysisData.trends || [])
      .map((trend: DetectedTrend) => {
        // Extract ACTUAL unique competitors from sample ad IDs
        const actualCompetitors = new Set<string>();
        (trend.evidence?.sampleAdIds || []).forEach(adId => {
          const competitor = adIdToCompetitor.get(adId);
          if (competitor) {
            actualCompetitors.add(competitor);
          }
        });

        const validatedCount = actualCompetitors.size;
        const validatedNames = Array.from(actualCompetitors);

        // Log if AI's count doesn't match reality
        const aiClaimedCount = trend.evidence?.competitorCount || 0;
        if (aiClaimedCount !== validatedCount) {
          console.log(`[Trends] "${trend.trendName}" - AI claimed ${aiClaimedCount} competitors, actual: ${validatedCount} (${validatedNames.join(', ')})`);
        }

        const trendResult: DetectedTrend = {
          trendName: trend.trendName || 'Unnamed Trend',
          category: trend.category || 'Visual',
          description: trend.description || '',
          evidence: {
            adCount: trend.evidence?.adCount || 0,
            competitorCount: validatedCount,        // Use VALIDATED count
            competitorNames: validatedNames,        // Use VALIDATED names
            avgScore: trend.evidence?.avgScore || 0,
            sampleAdIds: trend.evidence?.sampleAdIds || []
          },
          whyItWorks: trend.whyItWorks || '',
          recommendedAction: trend.recommendedAction || '',
          recencyScore: trend.recencyScore || 5
        };

        // Include gap analysis fields if present
        if (hasClientAds) {
          trendResult.hasGap = trend.hasGap ?? true;
          trendResult.clientGapAnalysis = trend.clientGapAnalysis || undefined;
          trendResult.adaptationRecommendation = trend.adaptationRecommendation || undefined;
          trendResult.matchingClientAdId = trend.matchingClientAdId || undefined;
          if (trend.gapDetails) {
            trendResult.gapDetails = {
              severity: trend.gapDetails.severity || 'moderate',
              missingElements: trend.gapDetails.missingElements || [],
              competitorsDoingItWell: trend.gapDetails.competitorsDoingItWell || [],
              clientStrengths: trend.gapDetails.clientStrengths || undefined,
            };
          }
        }

        return trendResult;
      })
      .filter((trend: DetectedTrend) => {
        // Filter using VALIDATED competitor count
        if (trend.evidence.competitorCount < 2) {
          console.log(`[Trends] Filtered out "${trend.trendName}" - only ${trend.evidence.competitorCount} competitor(s): ${trend.evidence.competitorNames.join(', ') || 'none'}`);
          return false;
        }
        return true;
      });

    return NextResponse.json({
      success: true,
      trends,
      summary
    });

  } catch (error) {
    console.error('Error in trend analysis route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
