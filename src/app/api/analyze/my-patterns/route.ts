import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { MyPatternAnalysis, Pattern } from '@/types/meta';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const PATTERN_ANALYSIS_PROMPT = `You are an expert advertising strategist analyzing a brand's Meta ad performance data to identify patterns in what's working and what's not.

## Ad Performance Data

### TOP PERFORMING ADS (by ROAS):
{topAds}

### UNDERPERFORMING ADS (low ROAS or high spend with few conversions):
{bottomAds}

### OVERALL METRICS:
- Total Ads Analyzed: {totalAds}
- Total Spend: ${'{totalSpend}'}
- Average ROAS: {avgRoas}x
- Average CPA: ${'{avgCpa}'}

{competitorContext}

## Analysis Instructions

Analyze this data and identify clear patterns. Focus on SPECIFIC CREATIVE ATTRIBUTES that can be actioned. Respond with a JSON object in this exact format:

{
  "winningPatterns": [
    {
      "name": "Pattern Name (e.g., 'Question Hooks + UGC')",
      "description": "2-3 sentence explanation of why this pattern works, with QUANTIFIED observations (e.g., 'Your top 3 ads all have hooks under 3 seconds')",
      "avgRoas": <number - average ROAS for ads matching this pattern>,
      "avgSpend": <number - average spend for ads in this pattern>,
      "adCount": <number - how many ads match this pattern>,
      "examples": ["ad_id_1", "ad_id_2"],
      "creativeAttributes": ["UGC", "Question Hook", "Under 15s", etc.],
      "competitorInsight": "Optional: Note if competitors are using similar patterns (e.g., '3 competitors scaling same format')"
    }
  ],
  "losingPatterns": [
    {
      "name": "Pattern Name (e.g., 'Generic Product Shots')",
      "description": "2-3 sentence explanation of why this pattern underperforms, with specific metrics",
      "avgRoas": <number>,
      "avgSpend": <number>,
      "adCount": <number>,
      "examples": ["ad_id_1", "ad_id_2"],
      "creativeAttributes": ["Studio Shot", "Long Form", "Product Focus", etc.]
    }
  ],
  "doubleDown": [
    {
      "title": "Actionable recommendation title",
      "description": "Specific action to take with QUANTIFIED expected outcome based on data",
      "expectedLift": "Estimated improvement (e.g., '15-25% ROAS increase based on pattern analysis')",
      "priority": "high | medium | low",
      "relatedAdIds": ["ad_id_1"]
    }
  ],
  "stopDoing": [
    "Specific thing to stop doing with QUANTIFIED impact (e.g., 'Stop using 30s+ videos - your 3 longest ads have 0.4x avg ROAS')",
    "Another thing to avoid"
  ],
  "testNext": [
    {
      "title": "Test idea title",
      "description": "What to test and why, with specific creative direction",
      "basis": "Why this is suggested based on the data",
      "competitorBenchmark": "Optional: What competitors are doing in this area"
    }
  ],
  "summary": "2-3 sentence executive summary with SPECIFIC NUMBERS from the analysis (e.g., 'Your UGC ads outperform studio shots by 2.3x')"
}

## Guidelines

1. **Be Specific with Numbers**: Always include quantified observations
   - BAD: "Short hooks work better"
   - GOOD: "Your top 3 ads have hooks under 3 seconds with avg 3.2x ROAS"

2. **Identify Creative Attributes**: For each pattern, tag specific attributes:
   - Hook length: "<3s", "3-5s", ">5s"
   - Format: "UGC", "Studio", "Lifestyle", "Product Demo"
   - Style: "Fast Cuts", "Talking Head", "Text Overlay"
   - Duration: "Under 15s", "15-30s", "30s+"

3. **Pattern Detection**: Look for commonalities in:
   - Ad naming conventions (often indicate format/hook type)
   - ROAS vs spend relationships
   - Conversion patterns
   - Status (active vs paused might indicate learnings)

4. **Actionable**: Every recommendation should be something the team can implement THIS WEEK

5. **Honest About Data Quality**: If there are fewer than 5 ads with performance data, acknowledge the limited data and provide what insights you can with appropriate caveats.`;

interface AdSummary {
  id: string;
  name: string;
  status: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpa: number;
}

function formatAdForPrompt(ad: AdSummary): string {
  return `- "${ad.name || 'Untitled'}" (ID: ${ad.id})
  Status: ${ad.status} | Spend: $${ad.spend.toFixed(2)} | ROAS: ${ad.roas.toFixed(2)}x
  Impressions: ${ad.impressions} | Clicks: ${ad.clicks} | CTR: ${ad.ctr.toFixed(2)}%
  Conversions: ${ad.conversions} | Revenue: $${ad.revenue.toFixed(2)} | CPA: ${ad.cpa > 0 ? `$${ad.cpa.toFixed(2)}` : 'N/A'}`;
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
    const { brandId, forceRefresh } = body;

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    // Check for cached analysis (valid for 24 hours)
    if (!forceRefresh) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cached } = await (supabase as any)
        .from('pattern_analyses')
        .select('analysis, analyzed_at')
        .eq('brand_id', brandId)
        .eq('user_id', user.id)
        .single();

      if (cached) {
        const cacheAge = Date.now() - new Date(cached.analyzed_at).getTime();
        const cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (cacheAge < cacheMaxAge) {
          return NextResponse.json({
            success: true,
            analysis: cached.analysis,
            cached: true,
            analyzedAt: cached.analyzed_at,
          });
        }
      }
    }

    // Fetch client ads for this brand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adsData, error: adsError } = await (supabase as any)
      .from('client_ads')
      .select('*')
      .eq('client_brand_id', brandId)
      .eq('user_id', user.id);

    if (adsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch ads' },
        { status: 500 }
      );
    }

    if (!adsData || adsData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No ads found. Please sync your Meta ads first.',
      });
    }

    // Fetch competitor ads for context (optional - enhance patterns with competitor insights)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: competitorAdsData } = await (supabase as any)
      .from('ads')
      .select('id, name, format, days_active, variation_count, hook_text, is_video')
      .eq('client_brand_id', brandId)
      .limit(30);

    const competitorAds = competitorAdsData || [];

    // Transform to summary format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ads: AdSummary[] = adsData.map((ad: any) => ({
      id: ad.id,
      name: ad.name || '',
      status: ad.effective_status || ad.status || '',
      spend: Number(ad.spend) || 0,
      impressions: Number(ad.impressions) || 0,
      clicks: Number(ad.clicks) || 0,
      ctr: Number(ad.ctr) || 0,
      conversions: Number(ad.conversions) || 0,
      revenue: Number(ad.revenue) || 0,
      roas: Number(ad.roas) || 0,
      cpa: Number(ad.cpa) || 0,
    }));

    // Calculate totals
    const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0);
    const totalRevenue = ads.reduce((sum, ad) => sum + ad.revenue, 0);
    const totalConversions = ads.reduce((sum, ad) => sum + ad.conversions, 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Sort and get top/bottom performers
    const adsWithSpend = ads.filter(ad => ad.spend > 0);
    const sortedByRoas = [...adsWithSpend].sort((a, b) => b.roas - a.roas);

    const topAds = sortedByRoas.slice(0, 10);
    const bottomAds = sortedByRoas.slice(-10).reverse();

    // Calculate data quality metrics
    const oldestSync = adsData.reduce((oldest: number, ad: { synced_at?: string }) => {
      const syncDate = ad.synced_at ? new Date(ad.synced_at).getTime() : Date.now();
      return syncDate < oldest ? syncDate : oldest;
    }, Date.now());
    const daysOfData = Math.max(1, Math.floor((Date.now() - oldestSync) / (1000 * 60 * 60 * 24)));
    const isReliable = daysOfData >= 7 && adsWithSpend.length >= 5;

    // Build competitor context if available
    let competitorContext = '';
    if (competitorAds.length > 0) {
      const videoCount = competitorAds.filter((a: { is_video?: boolean }) => a.is_video).length;
      const avgDaysActive = competitorAds.reduce((sum: number, a: { days_active?: number }) => sum + (a.days_active || 0), 0) / competitorAds.length;
      competitorContext = `
### COMPETITOR CONTEXT (${competitorAds.length} competitor ads tracked):
- ${videoCount} video ads (${Math.round(videoCount / competitorAds.length * 100)}% video)
- Average days active: ${avgDaysActive.toFixed(0)} days
- Note: Look for patterns your competitors are scaling that you could test.`;
    }

    // Build the prompt
    const prompt = PATTERN_ANALYSIS_PROMPT
      .replace('{topAds}', topAds.map(formatAdForPrompt).join('\n\n'))
      .replace('{bottomAds}', bottomAds.map(formatAdForPrompt).join('\n\n'))
      .replace('{totalAds}', String(ads.length))
      .replace('{totalSpend}', totalSpend.toFixed(2))
      .replace('{avgRoas}', avgRoas.toFixed(2))
      .replace('{avgCpa}', avgCpa.toFixed(2))
      .replace('{competitorContext}', competitorContext);

    // Call Gemini
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

    let analysisData: MyPatternAnalysis;
    try {
      const parsed = JSON.parse(jsonStr);

      // Build ad details map for UI to display thumbnails
      const adDetailsMap = new Map<string, { id: string; name: string; thumbnailUrl?: string; roas: number }>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adsData.forEach((ad: any) => {
        adDetailsMap.set(ad.id, {
          id: ad.id,
          name: ad.name || '',
          thumbnailUrl: ad.thumbnail_url || ad.image_url,
          roas: Number(ad.roas) || 0,
        });
      });

      // Enrich patterns with ad details
      const enrichPatterns = (patterns: Pattern[]) => {
        return patterns.map(pattern => ({
          ...pattern,
          exampleAds: pattern.examples
            ?.map(id => adDetailsMap.get(id))
            .filter(Boolean) || [],
        }));
      };

      analysisData = {
        ...parsed,
        winningPatterns: enrichPatterns(parsed.winningPatterns || []),
        losingPatterns: enrichPatterns(parsed.losingPatterns || []),
        analyzedAt: new Date().toISOString(),
        adsAnalyzed: ads.length,
        dataQuality: {
          daysOfData,
          adsAnalyzed: adsWithSpend.length,
          isReliable,
        },
        adDetails: Array.from(adDetailsMap.values()),
        accountAvgRoas: avgRoas,
      };
    } catch {
      console.error('Failed to parse Gemini response:', text);
      return NextResponse.json(
        { success: false, error: 'Failed to parse analysis response' },
        { status: 500 }
      );
    }

    // Cache the analysis (upsert)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('pattern_analyses')
        .upsert({
          brand_id: brandId,
          user_id: user.id,
          analysis: analysisData,
          analyzed_at: analysisData.analyzedAt,
        }, { onConflict: 'brand_id,user_id' });
    } catch (cacheError) {
      // Log but don't fail if caching fails
      console.error('Failed to cache pattern analysis:', cacheError);
    }

    return NextResponse.json({
      success: true,
      analysis: analysisData,
      cached: false,
      analyzedAt: analysisData.analyzedAt,
    });
  } catch (error) {
    console.error('Error in pattern analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
