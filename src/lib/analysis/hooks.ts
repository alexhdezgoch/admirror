import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  HookAnalysisRequest,
  HookLibraryAnalysis,
  AIHookAnalysis,
  HookPattern,
  HookRecommendation,
  HookLibrarySummary,
  EnhancedHookData,
  AdvancedHookType
} from '@/types/analysis';
import { SupabaseClient } from '@supabase/supabase-js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const HOOK_ANALYSIS_PROMPT = `You are an expert advertising copywriter and conversion specialist. Analyze the following hooks from Meta/Facebook ads and provide deep psychological insights.

HOOKS TO ANALYZE:
{hookData}

For each hook, analyze:
1. **Emotional Triggers**: What emotions does this hook tap into? (curiosity, fear, aspiration, urgency, etc.)
2. **Persuasion Technique**: What copywriting technique is used? (Pattern Interrupt, Social Proof, Scarcity, Authority, Storytelling, Direct Benefit, etc.)
3. **Psychological Principle**: What psychological principle makes this work? (Loss Aversion, Bandwagon Effect, Reciprocity, Anchoring, etc.)
4. **Why It Works**: 2-3 sentences explaining why this hook is effective at stopping the scroll

Classify each hook into one of these ADVANCED TYPES:
- curiosity_gap: Creates information gap that compels reading ("You won't believe...", "The secret to...")
- transformation: Shows before/after or journey ("I went from X to Y", "How I...")
- contrarian: Challenges conventional wisdom ("Everything you know about X is wrong", "Why X doesn't work")
- number_driven: Uses specific numbers for credibility ("7 ways to...", "83% of people...")
- pain_point: Directly addresses frustration ("Tired of X?", "Struggling with Y?")
- aspirational: Paints desirable future ("Imagine if...", "What if you could...")
- fear_based: Leverages fear of loss or mistake ("Don't make this mistake...", "Warning:")
- authority: Uses expert credibility ("Experts say...", "Doctors recommend...")
- story_opener: Begins a narrative ("Last year, I...", "My client Sarah...")
- direct_benefit: States clear outcome ("Get X in Y days", "Achieve X without Y")
- question: Engages with a question format
- challenge: Issues a challenge or dare ("I bet you can't...", "Try this...")

Score each hook:
- attentionScore (1-10): How well does it stop the scroll?
- clarityScore (1-10): How clear is the message?
- relevanceScore (1-10): How targeted to the audience?
- overallScore (1-10): Combined effectiveness

After analyzing individual hooks, identify:
1. **Patterns**: Common approaches used across multiple hooks
2. **Recommendations**: Generate 3-5 NEW hook suggestions based on the successful patterns and gaps
3. **Summary**: Dominant styles, emotional themes, gaps to exploit

Return a JSON object with this exact structure:
{
  "hookAnalyses": [
    {
      "hookText": "The original hook text",
      "emotionalTriggers": ["emotion1", "emotion2"],
      "persuasionTechnique": "technique name",
      "psychologicalPrinciple": "principle name",
      "whyItWorks": "2-3 sentence explanation",
      "advancedType": "type_from_list_above",
      "confidence": 85,
      "attentionScore": 8,
      "clarityScore": 7,
      "relevanceScore": 9,
      "overallScore": 8
    }
  ],
  "patterns": [
    {
      "name": "Pattern Name",
      "description": "Description of the pattern",
      "frequency": 5,
      "avgScore": 7.5,
      "exampleHooks": ["hook1", "hook2"]
    }
  ],
  "recommendations": [
    {
      "suggestedHook": "New suggested hook text",
      "basedOn": ["original hook 1", "original hook 2"],
      "targetEmotion": "primary emotion",
      "estimatedEffectiveness": 8,
      "reasoning": "Why this hook would work well"
    }
  ],
  "summary": {
    "dominantTypes": ["type1", "type2"],
    "emotionalThemes": ["theme1", "theme2"],
    "gaps": ["Missing approach 1", "Untapped angle 2"],
    "topPerformingStyle": "Description of most effective style"
  }
}

Be specific, actionable, and insightful. Focus on what makes each hook psychologically effective.`;

export interface AnalyzeHooksResult {
  analysis: HookLibraryAnalysis;
  cached: boolean;
  analyzedAt: string;
}

export async function analyzeHooks(
  params: {
    brandId: string;
    hooks: HookAnalysisRequest['hooks'];
    forceRefresh?: boolean;
  },
  supabase: SupabaseClient,
  userId: string
): Promise<AnalyzeHooksResult> {
  const { brandId, hooks, forceRefresh } = params;

  // Validate API key
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is not configured.');
  }

  // Validate request
  if (!brandId || !hooks || hooks.length === 0) {
    throw new Error('brandId and at least one hook are required');
  }

  // Check for cached analysis
  if (!forceRefresh) {
    const { data: cached } = await supabase
      .from('hook_analyses')
      .select('analysis, analyzed_at')
      .eq('brand_id', brandId)
      .single();

    if (cached) {
      const cachedTime = new Date(cached.analyzed_at);
      const now = new Date();
      const hoursSinceCached = (now.getTime() - cachedTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCached < 24) {
        return {
          analysis: cached.analysis as unknown as HookLibraryAnalysis,
          cached: true,
          analyzedAt: cached.analyzed_at,
        };
      }
    }
  }

  // Prepare hook data for the prompt (limit to top 15 hooks to stay within token limits)
  const hooksForAnalysis = hooks.slice(0, 15).map(hook => ({
    text: hook.text,
    type: hook.type,
    frequency: hook.frequency
  }));

  const prompt = HOOK_ANALYSIS_PROMPT.replace(
    '{hookData}',
    JSON.stringify(hooksForAnalysis, null, 2)
  );

  // Get the model - use gemini-2.0-flash for better rate limits
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse the JSON response — strip markdown fences, find the JSON object
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // No code fence — try to extract the first { ... } block
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
  }

  let analysisData;
  try {
    analysisData = JSON.parse(jsonStr);
  } catch {
    console.error('Failed to parse Gemini response (length=' + text.length + '):', text.slice(0, 500));
    throw new Error('Failed to parse hook analysis response');
  }

  // Map the AI analyses back to the original hooks
  const enhancedHooks: EnhancedHookData[] = hooks.map(hook => {
    const aiAnalysis = analysisData.hookAnalyses?.find(
      (a: { hookText: string }) => a.hookText.toLowerCase() === hook.text.toLowerCase()
    );

    if (aiAnalysis) {
      const analysis: AIHookAnalysis = {
        emotionalTriggers: aiAnalysis.emotionalTriggers || [],
        persuasionTechnique: aiAnalysis.persuasionTechnique || 'Unknown',
        psychologicalPrinciple: aiAnalysis.psychologicalPrinciple || 'Unknown',
        whyItWorks: aiAnalysis.whyItWorks || '',
        advancedType: (aiAnalysis.advancedType || 'question') as AdvancedHookType,
        confidence: aiAnalysis.confidence || 50,
        attentionScore: aiAnalysis.attentionScore || 5,
        clarityScore: aiAnalysis.clarityScore || 5,
        relevanceScore: aiAnalysis.relevanceScore || 5,
        overallScore: aiAnalysis.overallScore || 5
      };

      return {
        text: hook.text,
        type: hook.type,
        frequency: hook.frequency,
        adIds: hook.adIds,
        aiAnalysis: analysis
      };
    }

    return {
      text: hook.text,
      type: hook.type,
      frequency: hook.frequency,
      adIds: hook.adIds
    };
  });

  // Process patterns
  const patterns: HookPattern[] = (analysisData.patterns || []).map((p: HookPattern) => ({
    name: p.name || 'Unnamed Pattern',
    description: p.description || '',
    frequency: p.frequency || 0,
    avgScore: p.avgScore || 0,
    exampleHooks: p.exampleHooks || []
  }));

  // Process recommendations
  const recommendations: HookRecommendation[] = (analysisData.recommendations || []).map((r: HookRecommendation) => ({
    suggestedHook: r.suggestedHook || '',
    basedOn: r.basedOn || [],
    targetEmotion: r.targetEmotion || 'curiosity',
    estimatedEffectiveness: r.estimatedEffectiveness || 5,
    reasoning: r.reasoning || ''
  }));

  // Process summary
  const summary: HookLibrarySummary = {
    dominantTypes: analysisData.summary?.dominantTypes || [],
    emotionalThemes: analysisData.summary?.emotionalThemes || [],
    gaps: analysisData.summary?.gaps || [],
    topPerformingStyle: analysisData.summary?.topPerformingStyle || ''
  };

  const analyzedAt = new Date().toISOString();
  const analysis: HookLibraryAnalysis = {
    hooks: enhancedHooks,
    patterns,
    recommendations,
    summary,
    analyzedAt
  };

  // Save analysis to Supabase cache
  await supabase.from('hook_analyses').upsert({
    brand_id: brandId,
    user_id: userId,
    analysis: JSON.parse(JSON.stringify(analysis)),
    analyzed_at: analyzedAt
  }, { onConflict: 'brand_id' });

  return {
    analysis,
    cached: false,
    analyzedAt,
  };
}
