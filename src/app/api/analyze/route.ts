import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisRequest, AdAnalysis, HormoziScores, VideoMetadata } from '@/types/analysis';
import { createClient } from '@/lib/supabase/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const HORMOZI_SCORING_PROMPT = `
Additionally, score this ad using Alex Hormozi's Value Equation from "$100M Offers":

Value = (Dream Outcome + Perceived Likelihood) - (Time Delay + Effort & Sacrifice)

Score each dimension 1-10:

1. Dream Outcome (1-10): How desirable is the promised result?
   - 10 = Life-changing (e.g., "Make $10k/mo", "Lose 20lbs in 30 days")
   - 5 = Moderate benefit (e.g., "Save time", "Get organized")
   - 1 = Vague/Low impact (e.g., "Learn more", "Check it out")

2. Perceived Likelihood (1-10): Do they believe it will happen?
   - 10 = Guaranteed/Heavy social proof (testimonials, reviews, guarantees)
   - 5 = Some credibility signals
   - 1 = Risky/Unsubstantiated claims

3. Time Delay (1-10): How long until results? (LOWER IS BETTER for the customer)
   - 1 = Instant results ("Download now", "Immediate access", "In 5 minutes")
   - 5 = Days/weeks ("7-day program", "See results in 2 weeks")
   - 10 = Long-term investment ("4 year degree", "6 month program")

4. Effort & Sacrifice (1-10): How hard is it? (LOWER IS BETTER for the customer)
   - 1 = Done-for-you/Zero friction ("1-click", "No deposit", "We handle everything")
   - 5 = Some work required ("Follow the steps", "20 minutes a day")
   - 10 = High effort/sacrifice ("Fill 20-page form", "Major lifestyle change")

Determine the Hook Type based on which dimension is most emphasized:
- "Speed-Focused": Emphasizes quick results (low time delay)
- "Trust-Focused": Heavy on social proof and guarantees (high likelihood)
- "Low-Friction": Emphasizes ease (low effort)
- "Outcome-Focused": Leads with the dream result
- "Balanced": No single dimension dominates

Add to your JSON response:
"hormoziScores": {
  "dreamOutcome": <number 1-10>,
  "likelihood": <number 1-10>,
  "timeDelay": <number 1-10>,
  "effortSacrifice": <number 1-10>,
  "hookType": "<Speed-Focused|Trust-Focused|Low-Friction|Outcome-Focused|Balanced>"
}
`;

const VIDEO_ANALYSIS_PROMPT = `You are an expert advertising analyst specializing in Meta/Facebook ads. Analyze this video ad frame-by-frame.

IMPORTANT: This is a real video file. Analyze the ACTUAL video content at each timestamp - do not fabricate scenes.

Ad Context:
- Competitor: {competitorName}
- Hook Text: {hookText}
- Headline: {headline}
- Primary Text: {primaryText}
- CTA: {cta}
- Format: {format}
- Days Active: {daysActive}
- Variations: {variationCount}
- Performance Score: {score}/100 (Grade: {grade})
- Velocity Signal: {velocitySignal} (Score: {velocityScore})

Analyze the video and respond with a JSON object in this exact format:
{
  "hookAnalysis": {
    "description": "What happens in the first 3 seconds - describe the actual visual elements, motion, and how attention is captured",
    "whyItWorks": "Why this opening is effective for capturing attention"
  },
  "whyItWon": {
    "summary": "2-3 sentence explanation of why this ad is performing well based on its velocity score, structure, and visual elements",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"]
  },
  "swipeFile": {
    "howToAdapt": "Paragraph explaining how to adapt this ad's winning formula for other products/brands",
    "keep": ["Element to keep/steal 1", "Element to keep/steal 2", "Element to keep/steal 3", "Element to keep/steal 4"],
    "swap": ["Element to customize 1 - explain what and why", "Element to customize 2", "Element to customize 3"],
    "enhancementIdea": "A specific A/B test idea to potentially improve this ad format"
  },
  "creativeBlueprint": {
    "openingHook": "How the video opens and grabs attention",
    "storytellingStructure": "Narrative arc (problem-solution, demo, testimonial, before/after, etc.)",
    "visualStyle": "Aesthetic, colors, lighting, camera work",
    "pacing": "Edit rhythm - fast cuts, slow pans, transitions used",
    "audioCues": "Music style, BPM estimate, sound effects, voiceover tone"
  },
  "frameByFrame": [
    {
      "timestamp": "0:00-0:03",
      "scene": "Opening hook",
      "description": "What's happening visually in this scene",
      "visualElements": "Colors (#hex codes), objects, people, text overlays",
      "text": "On-screen text or captions",
      "audio": "Music/voiceover description for this segment",
      "transition": "Cut type to next scene (cut, fade, zoom, swipe, etc.)"
    },
    {
      "timestamp": "0:03-0:07",
      "scene": "Problem setup",
      "description": "...",
      "visualElements": "...",
      "text": "...",
      "audio": "...",
      "transition": "..."
    }
  ],
  "videoMetadata": {
    "estimatedDuration": "Duration in seconds (e.g., '15')",
    "sceneCount": <number of distinct scenes>,
    "primaryFormat": "talking head | product demo | lifestyle | testimonial | animation | UGC | mixed",
    "pacingStyle": "fast | medium | slow",
    "bpmEstimate": <estimated music BPM or null if no music>
  },
  "hormoziScores": {
    "dreamOutcome": <number 1-10>,
    "likelihood": <number 1-10>,
    "timeDelay": <number 1-10>,
    "effortSacrifice": <number 1-10>,
    "hookType": "<Speed-Focused|Trust-Focused|Low-Friction|Outcome-Focused|Balanced>"
  }
}

IMPORTANT INSTRUCTIONS:
- Provide frame-by-frame analysis grouped by SCENES (3-5 second chunks), not individual frames
- Include timestamp RANGES (e.g., "0:00-0:03") for each scene
- Note scene transitions, audio changes, and pacing shifts
- Be specific about colors (include hex codes), visual elements, and any text
- Describe the actual audio: music genre, voiceover presence, sound effects
- Focus on what makes this ad effective for advertising

${HORMOZI_SCORING_PROMPT}`;

const IMAGE_ANALYSIS_PROMPT = `You are an expert advertising analyst specializing in Meta/Facebook ads. Analyze this static image ad and provide a comprehensive breakdown.

Ad Context:
- Competitor: {competitorName}
- Hook Text: {hookText}
- Headline: {headline}
- Primary Text: {primaryText}
- CTA: {cta}
- Format: {format}
- Days Active: {daysActive}
- Variations: {variationCount}
- Performance Score: {score}/100 (Grade: {grade})
- Velocity Signal: {velocitySignal} (Score: {velocityScore})

Analyze the image and respond with a JSON object in this exact format:
{
  "hookAnalysis": {
    "description": "Detailed description of what immediately catches the eye in this image. Describe the focal point, visual hierarchy, and how attention is guided.",
    "whyItWorks": "Explanation of why this visual approach is effective for capturing attention in a feed"
  },
  "whyItWon": {
    "summary": "2-3 sentence explanation of why this ad is performing well based on its velocity score, visual composition, and messaging",
    "keyFactors": ["Factor 1", "Factor 2", "Factor 3"]
  },
  "swipeFile": {
    "howToAdapt": "Paragraph explaining how to adapt this ad's winning formula for other products/brands",
    "keep": ["Element to keep/steal 1", "Element to keep/steal 2", "Element to keep/steal 3", "Element to keep/steal 4"],
    "swap": ["Element to customize 1 - explain what and why", "Element to customize 2", "Element to customize 3"],
    "enhancementIdea": "A specific A/B test idea to potentially improve this ad format"
  },
  "creativeBlueprint": {
    "openingHook": "Description of the primary visual hook and focal point",
    "storytellingStructure": "Description of how the visual tells a story or conveys the message",
    "visualStyle": "Description of the visual aesthetic, colors, lighting, composition",
    "pacing": "Description of how the eye moves through the image, visual flow"
  },
  "zoneAnalysis": [
    {
      "zone": "top",
      "description": "Detailed description of the top third of the image (0-33% height). Include colors (hex codes), objects, background elements, text placement.",
      "text": "Any text in this zone"
    },
    {
      "zone": "center",
      "description": "Detailed description of the center third (33-66% height). This is typically the focal point. Include product details, sizing estimates, key visual elements.",
      "text": "Any text in this zone"
    },
    {
      "zone": "bottom",
      "description": "Detailed description of the bottom third (66-100% height). Include CTA elements, supporting visuals, brand elements.",
      "text": "Any text in this zone"
    }
  ],
  "hormoziScores": {
    "dreamOutcome": <number 1-10>,
    "likelihood": <number 1-10>,
    "timeDelay": <number 1-10>,
    "effortSacrifice": <number 1-10>,
    "hookType": "<Speed-Focused|Trust-Focused|Low-Friction|Outcome-Focused|Balanced>"
  }
}

Be specific about colors (include hex codes like #FFFFFF), visual elements, and estimated sizes. Focus on what makes this ad effective for advertising.

${HORMOZI_SCORING_PROMPT}`;

function buildPrompt(request: AnalysisRequest): string {
  const template = request.isVideo ? VIDEO_ANALYSIS_PROMPT : IMAGE_ANALYSIS_PROMPT;

  return template
    .replace('{competitorName}', request.competitorName)
    .replace('{hookText}', request.hookText || 'N/A')
    .replace('{headline}', request.headline || 'N/A')
    .replace('{primaryText}', request.primaryText || 'N/A')
    .replace('{cta}', request.cta || 'N/A')
    .replace('{format}', request.format)
    .replace('{daysActive}', String(request.daysActive))
    .replace('{variationCount}', String(request.variationCount))
    .replace('{score}', String(request.scoring.final))
    .replace('{grade}', request.scoring.grade)
    .replace('{velocitySignal}', request.scoring.velocity.signal)
    .replace('{velocityScore}', String(request.scoring.velocity.score));
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      data: base64,
      mimeType: contentType
    };
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

async function fetchVideoAsBase64(url: string): Promise<{ data: string; mimeType: string; sizeBytes: number } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'video/mp4';
    const arrayBuffer = await response.arrayBuffer();
    const sizeBytes = arrayBuffer.byteLength;
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      data: base64,
      mimeType: contentType,
      sizeBytes
    };
  } catch (error) {
    console.error('Error fetching video:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json();

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key is not configured. Add GEMINI_API_KEY to your environment variables.' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!body.adId) {
      return NextResponse.json(
        { success: false, error: 'adId is required' },
        { status: 400 }
      );
    }

    const mediaUrl = body.isVideo ? body.videoUrl : body.imageUrl;
    if (!mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'imageUrl or videoUrl is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client and get user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for cached analysis (if not forcing reanalyze)
    if (!body.forceReanalyze) {
      const { data: cached } = await supabase
        .from('ad_analyses')
        .select('analysis, analyzed_at')
        .eq('ad_id', body.adId)
        .single();

      if (cached) {
        return NextResponse.json({
          success: true,
          analysis: cached.analysis as unknown as AdAnalysis,
          cached: true,
          analyzedAt: cached.analyzed_at
        });
      }
    }

    // Build the prompt with context
    const prompt = buildPrompt(body);

    // Get the model - use gemini-2.0-flash for vision tasks
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let result;

    if (body.isVideo && body.videoUrl) {
      // Fetch actual video file for true frame-by-frame analysis
      const videoData = await fetchVideoAsBase64(body.videoUrl);

      if (!videoData) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch video for analysis' },
          { status: 400 }
        );
      }

      // Check size - inline for small videos (< 20MB), fall back to thumbnail for large
      const MAX_INLINE_SIZE = 20 * 1024 * 1024; // 20MB
      if (videoData.sizeBytes > MAX_INLINE_SIZE) {
        // Fall back to thumbnail analysis for very large videos
        console.warn(`Video too large (${(videoData.sizeBytes / (1024 * 1024)).toFixed(1)}MB), using thumbnail fallback`);
        const imageData = await fetchImageAsBase64(body.imageUrl || body.videoUrl);

        if (!imageData) {
          return NextResponse.json(
            { success: false, error: 'Failed to fetch media for analysis' },
            { status: 400 }
          );
        }

        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: imageData.data,
              mimeType: imageData.mimeType
            }
          }
        ]);
      } else {
        // Send actual video to Gemini for true frame-by-frame analysis
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: videoData.data,
              mimeType: videoData.mimeType
            }
          }
        ]);
      }
    } else {
      // For images
      const imageData = await fetchImageAsBase64(mediaUrl);

      if (!imageData) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch image for analysis' },
          { status: 400 }
        );
      }

      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageData.data,
            mimeType: imageData.mimeType
          }
        }
      ]);
    }

    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
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
        { success: false, error: 'Failed to parse analysis response' },
        { status: 500 }
      );
    }

    // Process Hormozi scores with calculated value equation
    let hormoziScores: HormoziScores | undefined;
    if (analysisData.hormoziScores) {
      const { dreamOutcome, likelihood, timeDelay, effortSacrifice, hookType } = analysisData.hormoziScores;
      // Value Equation: (Dream + Likelihood) - (Time + Effort)
      // Range: -18 (worst) to +18 (best)
      const valueEquation = (dreamOutcome + likelihood) - (timeDelay + effortSacrifice);
      hormoziScores = {
        dreamOutcome,
        likelihood,
        timeDelay,
        effortSacrifice,
        valueEquation,
        hookType: hookType || 'Balanced'
      };
    }

    // Process video metadata for video ads
    let videoMetadata: VideoMetadata | undefined;
    if (body.isVideo && analysisData.videoMetadata) {
      videoMetadata = {
        estimatedDuration: analysisData.videoMetadata.estimatedDuration,
        sceneCount: analysisData.videoMetadata.sceneCount,
        primaryFormat: analysisData.videoMetadata.primaryFormat,
        pacingStyle: analysisData.videoMetadata.pacingStyle,
        bpmEstimate: analysisData.videoMetadata.bpmEstimate
      };
    }

    // Construct the full analysis object
    const analyzedAt = new Date().toISOString();
    const analysis: AdAnalysis = {
      id: `analysis-${body.adId}-${Date.now()}`,
      adId: body.adId,
      hookAnalysis: analysisData.hookAnalysis,
      whyItWon: analysisData.whyItWon,
      swipeFile: analysisData.swipeFile,
      creativeBlueprint: analysisData.creativeBlueprint,
      frameByFrame: body.isVideo ? analysisData.frameByFrame : undefined,
      zoneAnalysis: !body.isVideo ? analysisData.zoneAnalysis : undefined,
      videoMetadata,
      hormoziScores,
      analyzedAt,
      isVideo: body.isVideo
    };

    // Save analysis to Supabase cache (if user is authenticated)
    if (user) {
      await supabase.from('ad_analyses').upsert({
        ad_id: body.adId,
        user_id: user.id,
        analysis: JSON.parse(JSON.stringify(analysis)),
        analyzed_at: analyzedAt
      }, { onConflict: 'ad_id' });
    }

    return NextResponse.json({
      success: true,
      analysis,
      cached: false,
      analyzedAt
    });

  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
