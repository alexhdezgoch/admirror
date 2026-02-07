import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { PlaybookContent, GeneratePlaybookResponse } from '@/types/playbook';
import { MyPatternAnalysis } from '@/types/meta';
import { DetectedTrend } from '@/types/analysis';
import { Json } from '@/types/supabase';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const PLAYBOOK_SYNTHESIS_PROMPT = `You are a $500/hr creative strategist creating a premium creative strategy brief for a brand.

Your goal is to synthesize the client's performance data with competitor intelligence into an actionable playbook that answers:
1. What creative formats should I make next?
2. What hooks and angles should I test?
3. What's working for competitors that I'm not doing?
4. What should I stop doing?

## CLIENT'S OWN PERFORMANCE DATA (My Patterns):
{myPatternsData}

## COMPETITOR TRENDS & GAPS:
{trendsData}

## TOP COMPETITOR ADS:
{topAdsData}

## INSTRUCTIONS

Create a comprehensive creative strategy brief. Be SPECIFIC and QUANTIFIED with recommendations.
Use actual numbers from the data. Reference specific ads by ID when relevant.

Respond with a JSON object in this EXACT format:

{
  "executiveSummary": {
    "topInsight": "The single most important insight from this analysis (1-2 sentences)",
    "yourStrengths": ["Strength 1 with data", "Strength 2 with data", "Strength 3"],
    "biggestGaps": ["Gap 1 - competitors doing X you're not", "Gap 2", "Gap 3"],
    "quickWins": ["Immediate action 1", "Immediate action 2", "Immediate action 3"]
  },
  "formatStrategy": {
    "summary": "2-3 sentence overview of format recommendations",
    "recommendations": [
      {
        "format": "video | static | carousel",
        "action": "scale | test | reduce",
        "rationale": "Why this recommendation based on data",
        "yourData": "Your performance with this format",
        "competitorData": "What competitors are doing with this format"
      }
    ]
  },
  "hookStrategy": {
    "summary": "2-3 sentence overview of hook recommendations",
    "toTest": [
      {
        "hookTemplate": "Specific hook template to try (e.g., 'I tried [X] for 30 days...')",
        "hookType": "curiosity | transformation | pain_point | social_proof | etc",
        "whyItWorks": "Psychology behind why this works",
        "source": "competitor_trend | your_winners | gap_analysis",
        "exampleAdIds": ["ad_id_1", "ad_id_2"],
        "priority": "high | medium | low"
      }
    ],
    "yourWinningHooks": ["Hook pattern you should keep using", "Another winning hook style"]
  },
  "competitorGaps": {
    "summary": "2-3 sentence overview of competitive opportunities",
    "opportunities": [
      {
        "patternName": "Name of the pattern/trend",
        "description": "What this pattern is and why it's working",
        "competitorsUsing": ["Competitor 1", "Competitor 2"],
        "gapSeverity": "critical | moderate | minor",
        "adaptationSuggestion": "Specific way to adapt this for your brand",
        "exampleAdIds": ["ad_id_1"]
      }
    ]
  },
  "stopDoing": {
    "summary": "2-3 sentence overview of what to stop",
    "patterns": [
      {
        "pattern": "What to stop doing",
        "reason": "Why it's not working",
        "yourData": "Your performance data showing this",
        "competitorComparison": "How competitors handle this differently"
      }
    ]
  },
  "topPerformers": {
    "competitorAds": [
      {
        "adId": "ad_id",
        "competitorName": "Competitor name",
        "whyItWorks": "What makes this ad effective",
        "stealableElements": ["Element 1 to adapt", "Element 2 to adapt"]
      }
    ]
  }
}

## GUIDELINES

1. **Be Specific**: Use actual numbers, percentages, and ad IDs from the data
2. **Prioritize**: Most impactful recommendations first
3. **Actionable**: Every recommendation should be implementable THIS WEEK
4. **Grounded**: Every insight must reference actual data provided
5. **Strategic**: Think like a premium creative strategist - focus on the "why" not just the "what"
6. **Honest**: If data is limited, acknowledge it and provide appropriately cautious recommendations

Return 3-5 items per section. Focus on quality over quantity.`;

interface AdSummary {
  id: string;
  competitorName: string;
  format: string;
  daysActive: number;
  hookText: string | null;
  headline: string | null;
  score: number | null;
  creativeElements: string[];
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

    // Verify brand belongs to user
    const { data: brand } = await supabase
      .from('client_brands')
      .select('id, name')
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

    // 2. Fetch Competitor Trends
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

    // 3. Fetch Top Competitor Ads
    const { data: competitorAds } = await supabase
      .from('ads')
      .select('id, competitor_name, format, days_active, hook_text, headline, scoring, creative_elements')
      .eq('client_brand_id', brandId)
      .eq('is_client_ad', false)
      .order('scoring->final', { ascending: false })
      .limit(20);

    const topAds: AdSummary[] = (competitorAds || []).map(ad => ({
      id: ad.id,
      competitorName: ad.competitor_name,
      format: ad.format,
      daysActive: ad.days_active,
      hookText: ad.hook_text,
      headline: ad.headline,
      score: (ad.scoring as { final?: number } | null)?.final || null,
      creativeElements: ad.creative_elements || [],
    }));

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

    const topAdsStr = topAds.length > 0
      ? JSON.stringify(topAds, null, 2)
      : 'No competitor ads available';

    const prompt = PLAYBOOK_SYNTHESIS_PROMPT
      .replace('{myPatternsData}', myPatternsStr)
      .replace('{trendsData}', trendsStr)
      .replace('{topAdsData}', topAdsStr);

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

      // Add data snapshot
      playbookContent = {
        ...parsed,
        dataSnapshot: {
          myPatternsIncluded: !!myPatternsData,
          clientAdsAnalyzed,
          competitorAdsAnalyzed: topAds.length,
          trendsIncorporated: trendsCount,
          generatedAt: new Date().toISOString(),
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
