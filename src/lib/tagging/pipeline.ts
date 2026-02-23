import { createHash } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PipelineStats, CreativeTagSet, CombinedPipelineStats } from '@/types/creative-tags';
import { DIMENSION_KEYS } from './taxonomy';
import { tagAdImage } from './vision';
import { runVideoTaggingPipeline } from './video-pipeline';
import { syncClientAdsForTagging } from '@/lib/analysis/creative-gap';

const BATCH_SIZE = 200;
const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const SONNET_MODEL = 'claude-sonnet-4-20250514';

async function hashImageFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return createHash('sha256').update(Buffer.from(buffer)).digest('hex');
  } catch {
    return null;
  }
}

export async function runTaggingPipeline(): Promise<PipelineStats> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stats: PipelineStats = {
    total: 0,
    tagged: 0,
    deduped: 0,
    failed: 0,
    skipped: 0,
    totalCostUsd: 0,
    durationMs: 0,
  };

  // 1. Fetch untagged ads
  const { data: ads, error: adsError } = await supabase
    .from('ads')
    .select('id, thumbnail_url, image_hash, tagging_retry_count')
    .in('tagging_status', ['pending', 'failed'])
    .or('days_active.gte.2,is_client_ad.eq.true')
    .not('thumbnail_url', 'is', null)
    .lt('tagging_retry_count', MAX_RETRIES)
    .order('days_active', { ascending: true })
    .limit(BATCH_SIZE);

  if (adsError || !ads || ads.length === 0) {
    stats.durationMs = Date.now() - startTime;
    return stats;
  }

  stats.total = ads.length;

  // 2. Build hash→tags dedup lookup from already-tagged ads
  const { data: existingTags } = await supabase
    .from('creative_tags')
    .select('ad_id, format_type, hook_type_visual, human_presence, text_overlay_density, text_overlay_position, color_temperature, background_style, product_visibility, cta_visual_style, visual_composition, brand_element_presence, emotion_energy_level');

  const { data: taggedAds } = await supabase
    .from('ads')
    .select('id, image_hash')
    .not('image_hash', 'is', null)
    .eq('tagging_status', 'tagged');

  const hashToTags = new Map<string, { adId: string; tags: Record<string, string> }>();
  if (existingTags && taggedAds) {
    const tagMap = new Map(existingTags.map((t: Record<string, unknown>) => [t.ad_id as string, t]));
    for (const ad of taggedAds) {
      const tag = tagMap.get(ad.id);
      if (tag && ad.image_hash) {
        const tagValues: Record<string, string> = {};
        for (const key of DIMENSION_KEYS) {
          tagValues[key] = (tag[key] as string) || '';
        }
        hashToTags.set(ad.image_hash, { adId: ad.id, tags: tagValues });
      }
    }
  }

  // 3. Process in concurrent batches
  for (let i = 0; i < ads.length; i += CONCURRENCY) {
    const batch = ads.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (ad) => {
        const now = new Date().toISOString();

        try {
          // a. Hash image if not already hashed
          let imageHash = ad.image_hash;
          if (!imageHash && ad.thumbnail_url) {
            imageHash = await hashImageFromUrl(ad.thumbnail_url);
            if (imageHash) {
              await supabase.from('ads').update({ image_hash: imageHash }).eq('id', ad.id);
            }
          }

          // b. Check dedup
          if (imageHash && hashToTags.has(imageHash)) {
            const match = hashToTags.get(imageHash)!;
            await supabase.from('creative_tags').insert({
              ad_id: ad.id,
              ...match.tags,
              model_version: SONNET_MODEL,
              source: 'hash_dedup',
              source_ad_id: match.adId,
            });
            await supabase
              .from('ads')
              .update({ tagging_status: 'tagged', tagging_attempted_at: now })
              .eq('id', ad.id);
            stats.deduped++;
            return;
          }

          // c. Call vision API
          const result = await tagAdImage(ad.thumbnail_url!);

          // Log cost
          await supabase.from('tagging_cost_log').insert({
            ad_id: ad.id,
            model: SONNET_MODEL,
            input_tokens: result.inputTokens,
            output_tokens: result.outputTokens,
            estimated_cost_usd: result.estimatedCostUsd,
            duration_ms: result.durationMs,
            success: !!result.tags,
            error_message: result.error || null,
          });

          if (result.error === 'RATE_LIMITED') {
            const retryCount = (ad.tagging_retry_count || 0) + 1;
            const backoffMs = Math.min(1000 * 2 ** retryCount, 30000);
            await new Promise((r) => setTimeout(r, backoffMs));
            await supabase
              .from('ads')
              .update({
                tagging_retry_count: retryCount,
                tagging_last_error: 'RATE_LIMITED',
                tagging_status: retryCount >= MAX_RETRIES ? 'skipped' : 'failed',
                tagging_attempted_at: now,
              })
              .eq('id', ad.id);
            if (retryCount >= MAX_RETRIES) {
              stats.skipped++;
            } else {
              stats.failed++;
            }
            return;
          }

          if (result.tags) {
            await supabase.from('creative_tags').insert({
              ad_id: ad.id,
              ...result.tags,
              model_version: SONNET_MODEL,
              source: 'vision_api',
            });
            await supabase
              .from('ads')
              .update({ tagging_status: 'tagged', tagging_attempted_at: now })
              .eq('id', ad.id);
            stats.tagged++;
            stats.totalCostUsd += result.estimatedCostUsd;

            // Add to dedup lookup for subsequent ads in this run
            if (imageHash) {
              const tagValues: Record<string, string> = {};
              for (const key of DIMENSION_KEYS) {
                tagValues[key] = result.tags[key as keyof CreativeTagSet];
              }
              hashToTags.set(imageHash, { adId: ad.id, tags: tagValues });
            }
          } else {
            // d. Handle failure
            const retryCount = (ad.tagging_retry_count || 0) + 1;
            await supabase
              .from('ads')
              .update({
                tagging_retry_count: retryCount,
                tagging_last_error: result.error || 'Unknown error',
                tagging_status: retryCount >= MAX_RETRIES ? 'skipped' : 'failed',
                tagging_attempted_at: now,
              })
              .eq('id', ad.id);
            if (retryCount >= MAX_RETRIES) {
              stats.skipped++;
            } else {
              stats.failed++;
            }
          }
        } catch (error) {
          const retryCount = (ad.tagging_retry_count || 0) + 1;
          await supabase
            .from('ads')
            .update({
              tagging_retry_count: retryCount,
              tagging_last_error: error instanceof Error ? error.message : 'Unknown error',
              tagging_status: retryCount >= MAX_RETRIES ? 'skipped' : 'failed',
              tagging_attempted_at: new Date().toISOString(),
            })
            .eq('id', ad.id);
          if (retryCount >= MAX_RETRIES) {
            stats.skipped++;
          } else {
            stats.failed++;
          }
        }
      })
    );
  }

  stats.durationMs = Date.now() - startTime;
  return stats;
}

async function syncAllClientAds(): Promise<{ brands: number; synced: number }> {
  const supabase = getSupabaseAdmin();
  const { data: brands } = await supabase.from('client_brands').select('id');
  if (!brands || brands.length === 0) return { brands: 0, synced: 0 };

  let totalSynced = 0;
  for (const brand of brands) {
    try {
      const result = await syncClientAdsForTagging(brand.id);
      totalSynced += result.synced;
    } catch (error) {
      console.error(`[TAG-PIPELINE] Failed to sync client ads for brand ${brand.id}:`, error);
    }
  }

  console.log(`[TAG-PIPELINE] Client ad sync: ${totalSynced} new ads across ${brands.length} brands`);
  return { brands: brands.length, synced: totalSynced };
}

export async function runCombinedTaggingPipeline(): Promise<CombinedPipelineStats> {
  await syncAllClientAds();
  const imageStats = await runTaggingPipeline();
  const videoStats = await runVideoTaggingPipeline();
  return { image: imageStats, video: videoStats };
}
