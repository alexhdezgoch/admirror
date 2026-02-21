import Anthropic from '@anthropic-ai/sdk';
import { TaggingResult } from '@/types/creative-tags';
import { buildTaggingPrompt, validateTagSet } from './taxonomy';

const SONNET_MODEL = 'claude-sonnet-4-20250514';
const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      data: base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error('[vision] Error fetching image:', error);
    return null;
  }
}

export async function tagAdImage(imageUrl: string): Promise<TaggingResult> {
  const startTime = Date.now();

  const image = await fetchImageAsBase64(imageUrl);
  if (!image) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostUsd: 0,
      durationMs: Date.now() - startTime,
      error: 'Failed to fetch image',
    };
  }

  try {
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
                media_type: image.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: image.data,
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
    const estimatedCostUsd =
      (inputTokens * INPUT_COST_PER_MILLION + outputTokens * OUTPUT_COST_PER_MILLION) / 1_000_000;

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
      tags: parsed as TaggingResult['tags'],
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
