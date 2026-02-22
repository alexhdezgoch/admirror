import Anthropic from '@anthropic-ai/sdk';
import { TaggingResult, CreativeTagSet } from '@/types/creative-tags';
import { VideoTaggingResult } from '@/types/creative-tags';
import { buildTaggingPrompt, validateTagSet, DIMENSION_KEYS } from './taxonomy';
import { buildVideoTaggingPrompt, validateVideoTagSet, getDurationBucket } from './video-taxonomy';

const SONNET_MODEL = 'claude-sonnet-4-20250514';
const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

function calculateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * INPUT_COST_PER_MILLION + outputTokens * OUTPUT_COST_PER_MILLION) / 1_000_000;
}

export async function tagHookFrame(frameBuffer: Buffer): Promise<TaggingResult> {
  const startTime = Date.now();

  try {
    const base64 = frameBuffer.toString('base64');

    const response = await anthropic.messages.create({
      model: SONNET_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
            {
              type: 'text',
              text: buildTaggingPrompt(),
            },
          ],
        },
      ],
    });

    const durationMs = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd = calculateCost(inputTokens, outputTokens);

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { inputTokens, outputTokens, estimatedCostUsd, durationMs, error: 'No text in response' };
    }

    let jsonStr = textBlock.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return { inputTokens, outputTokens, estimatedCostUsd, durationMs, error: 'Failed to parse JSON response' };
    }

    const validation = validateTagSet(parsed);
    if (!validation.valid) {
      return {
        inputTokens,
        outputTokens,
        estimatedCostUsd,
        durationMs,
        error: `Validation failed: ${validation.errors.join('; ')}`,
      };
    }

    return {
      tags: parsed as CreativeTagSet,
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    if (error instanceof Anthropic.RateLimitError) {
      return { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, durationMs, error: 'RATE_LIMITED' };
    }

    return {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown vision API error',
    };
  }
}

export interface VisualShift {
  frameIndex: number;
  description: string;
}

export interface ShiftDetectionResult {
  shifts: VisualShift[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  durationMs: number;
}

export async function detectVisualShifts(frames: Buffer[]): Promise<ShiftDetectionResult> {
  const startTime = Date.now();
  const shifts: VisualShift[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  for (let i = 0; i < frames.length - 1; i++) {
    try {
      const response = await anthropic.messages.create({
        model: SONNET_MODEL,
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: frames[i].toString('base64'),
                },
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: frames[i + 1].toString('base64'),
                },
              },
              {
                type: 'text',
                text: 'Compare these two consecutive frames from a video ad. Is there a MAJOR visual change (different scene, person, product focus, transition)? Reply JSON only: { "changed": true/false, "description": "brief description if changed" }',
              },
            ],
          },
        ],
      });

      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;
      totalCostUsd += calculateCost(inputTokens, outputTokens);

      const textBlock = response.content.find((block) => block.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        let jsonStr = textBlock.text;
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) jsonStr = jsonMatch[1].trim();

        try {
          const parsed = JSON.parse(jsonStr) as { changed?: boolean; description?: string };
          if (parsed.changed) {
            shifts.push({
              frameIndex: i + 1,
              description: parsed.description || 'Visual change detected',
            });
          }
        } catch {
          // Skip unparseable shift detection
        }
      }
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        break;
      }
      // Skip this pair on error
    }
  }

  return {
    shifts,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    durationMs: Date.now() - startTime,
  };
}

export async function tagVideoContent(
  transcript: string,
  hookTags: CreativeTagSet,
  durationSeconds: number
): Promise<VideoTaggingResult> {
  const startTime = Date.now();

  const hookTagsSummary = DIMENSION_KEYS
    .map((key) => `${key}: ${hookTags[key as keyof CreativeTagSet]}`)
    .join(', ');

  const prompt = buildVideoTaggingPrompt(transcript, hookTagsSummary);

  try {
    const response = await anthropic.messages.create({
      model: SONNET_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const durationMs = Date.now() - startTime;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const estimatedCostUsd = calculateCost(inputTokens, outputTokens);

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { inputTokens, outputTokens, estimatedCostUsd, durationMs, error: 'No text in response' };
    }

    let jsonStr = textBlock.text;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      return { inputTokens, outputTokens, estimatedCostUsd, durationMs, error: 'Failed to parse JSON response' };
    }

    // Add the calculated duration bucket
    parsed.video_duration_bucket = getDurationBucket(durationSeconds);

    const validation = validateVideoTagSet(parsed);
    if (!validation.valid) {
      return {
        inputTokens,
        outputTokens,
        estimatedCostUsd,
        durationMs,
        error: `Validation failed: ${validation.errors.join('; ')}`,
      };
    }

    return {
      tags: parsed as unknown as VideoTaggingResult['tags'],
      inputTokens,
      outputTokens,
      estimatedCostUsd,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;

    if (error instanceof Anthropic.RateLimitError) {
      return { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0, durationMs, error: 'RATE_LIMITED' };
    }

    return {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs,
      error: error instanceof Error ? error.message : 'Unknown video tagging error',
    };
  }
}
