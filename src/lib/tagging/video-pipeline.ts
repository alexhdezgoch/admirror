import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { VideoPipelineStats } from '@/types/creative-tags';
import { DIMENSION_KEYS } from './taxonomy';
import { getDurationBucket, VIDEO_DIMENSION_KEYS } from './video-taxonomy';
import { extractKeyframesAndAudio, cleanupTempFiles } from './ffmpeg';
import { transcribeAudio } from './whisper';
import { tagHookFrame, detectVisualShifts, tagVideoContent } from './video-vision';

const VIDEO_BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const TIME_BUDGET_MS = 250_000; // 250s — leave buffer for image pipeline
const SONNET_MODEL = 'claude-sonnet-4-20250514';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

export async function runVideoTaggingPipeline(): Promise<VideoPipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: VideoPipelineStats = {
    total: 0,
    tagged: 0,
    failed: 0,
    skipped: 0,
    noAudio: 0,
    totalCostUsd: 0,
    durationMs: 0,
  };

  // 1. Fetch untagged video ads
  const { data: ads, error: adsError } = await supabase
    .from('ads')
    .select('id, video_url, video_duration, video_tagging_retry_count')
    .eq('is_video', true)
    .in('video_tagging_status', ['pending', 'failed'])
    .not('video_url', 'is', null)
    .lt('video_tagging_retry_count', MAX_RETRIES)
    .or('days_active.gte.2,is_client_ad.eq.true')
    .order('days_active', { ascending: false })
    .limit(VIDEO_BATCH_SIZE);

  if (adsError || !ads || ads.length === 0) {
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  stats.total = ads.length;

  // 2. Process sequentially (CPU-intensive ffmpeg work)
  for (const ad of ads) {
    // Time budget check
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      console.log('[VIDEO-PIPELINE] Time budget reached, stopping');
      break;
    }

    const now = new Date().toISOString();

    try {
      // Mark as attempted
      await supabase
        .from('ads')
        .update({ video_tagging_attempted_at: now })
        .eq('id', ad.id);

      // a. Extract keyframes and audio
      const extraction = await extractKeyframesAndAudio(ad.video_url!, ad.id);

      if (extraction.frames.length === 0) {
        throw new Error('No keyframes extracted');
      }

      // Log keyframe extraction cost (no API cost, just tracking)
      await supabase.from('video_tagging_cost_log').insert({
        ad_id: ad.id,
        model: 'ffmpeg',
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost_usd: 0,
        duration_ms: 0,
        success: true,
        stage: 'keyframe_extraction',
      });

      // b. Transcribe audio if available
      let transcript = '';
      let wordCount = 0;
      if (extraction.audioPath) {
        const transcription = await transcribeAudio(extraction.audioPath);
        transcript = transcription.transcript;
        wordCount = transcription.wordCount;

        if (!transcription.error) {
          await supabase.from('video_tagging_cost_log').insert({
            ad_id: ad.id,
            model: WHISPER_MODEL,
            input_tokens: 0,
            output_tokens: 0,
            estimated_cost_usd: transcription.estimatedCostUsd,
            duration_ms: transcription.durationMs,
            success: true,
            stage: 'transcription',
            audio_seconds: Math.round(transcription.audioSeconds),
          });
          stats.totalCostUsd += transcription.estimatedCostUsd;
        }
      } else {
        stats.noAudio++;
      }

      // Clean up temp files
      await cleanupTempFiles(ad.id);

      // c. Tag hook frame (first frame) with 12D visual taxonomy
      const hookResult = await tagHookFrame(extraction.frames[0]);

      await supabase.from('video_tagging_cost_log').insert({
        ad_id: ad.id,
        model: SONNET_MODEL,
        input_tokens: hookResult.inputTokens,
        output_tokens: hookResult.outputTokens,
        estimated_cost_usd: hookResult.estimatedCostUsd,
        duration_ms: hookResult.durationMs,
        success: !!hookResult.tags,
        error_message: hookResult.error || null,
        stage: 'hook_tagging',
      });
      stats.totalCostUsd += hookResult.estimatedCostUsd;

      if (!hookResult.tags) {
        throw new Error(`Hook frame tagging failed: ${hookResult.error}`);
      }

      // d. Detect visual shifts between consecutive frames
      const shiftResult = await detectVisualShifts(extraction.frames);

      await supabase.from('video_tagging_cost_log').insert({
        ad_id: ad.id,
        model: SONNET_MODEL,
        input_tokens: shiftResult.totalInputTokens,
        output_tokens: shiftResult.totalOutputTokens,
        estimated_cost_usd: shiftResult.totalCostUsd,
        duration_ms: shiftResult.durationMs,
        success: true,
        stage: 'shift_detection',
      });
      stats.totalCostUsd += shiftResult.totalCostUsd;

      // e. Tag video content (7 video dimensions from transcript + hook context)
      const durationSeconds = extraction.durationSeconds || ad.video_duration || 0;
      const videoResult = await tagVideoContent(transcript, hookResult.tags, durationSeconds);

      await supabase.from('video_tagging_cost_log').insert({
        ad_id: ad.id,
        model: SONNET_MODEL,
        input_tokens: videoResult.inputTokens,
        output_tokens: videoResult.outputTokens,
        estimated_cost_usd: videoResult.estimatedCostUsd,
        duration_ms: videoResult.durationMs,
        success: !!videoResult.tags,
        error_message: videoResult.error || null,
        stage: 'video_tagging',
      });
      stats.totalCostUsd += videoResult.estimatedCostUsd;

      if (!videoResult.tags) {
        throw new Error(`Video content tagging failed: ${videoResult.error}`);
      }

      // f. Build hook tag columns with hook_ prefix
      const hookColumns: Record<string, string> = {};
      for (const key of DIMENSION_KEYS) {
        hookColumns[`hook_${key}`] = hookResult.tags[key as keyof typeof hookResult.tags];
      }

      // g. Build video tag columns
      const videoColumns: Record<string, string> = {};
      for (const key of VIDEO_DIMENSION_KEYS) {
        videoColumns[key] = videoResult.tags[key as keyof typeof videoResult.tags];
      }

      // Ensure duration bucket is set from metadata
      videoColumns.video_duration_bucket = getDurationBucket(durationSeconds);

      // h. INSERT into video_tags
      await supabase.from('video_tags').insert({
        ad_id: ad.id,
        ...hookColumns,
        ...videoColumns,
        visual_shifts: shiftResult.shifts,
        keyframe_count: extraction.frames.length,
        model_version: SONNET_MODEL,
        transcription_model: extraction.audioPath ? WHISPER_MODEL : null,
        transcription_duration_ms: extraction.audioPath ? undefined : null,
      });

      // i. UPDATE ads
      await supabase
        .from('ads')
        .update({
          video_tagging_status: 'tagged',
          video_tagging_attempted_at: now,
          transcript: transcript || null,
          transcript_word_count: wordCount,
        })
        .eq('id', ad.id);

      stats.tagged++;
    } catch (error) {
      // Clean up temp files on failure
      await cleanupTempFiles(ad.id).catch(() => {});

      const retryCount = (ad.video_tagging_retry_count || 0) + 1;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await supabase
        .from('ads')
        .update({
          video_tagging_retry_count: retryCount,
          video_tagging_last_error: errorMessage,
          video_tagging_status: retryCount >= MAX_RETRIES ? 'skipped' : 'failed',
          video_tagging_attempted_at: now,
        })
        .eq('id', ad.id);

      if (retryCount >= MAX_RETRIES) {
        stats.skipped++;
      } else {
        stats.failed++;
      }
    }
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}
