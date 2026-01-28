import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Ad } from '@/types';

const BUCKET = 'ad-media';
const DOWNLOAD_TIMEOUT_MS = 15_000;

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'application/octet-stream': 'bin',
};

/** Returns true if the URL already points to our Supabase Storage bucket. */
function isSupabaseStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !!supabaseUrl && url.startsWith(supabaseUrl);
}

/**
 * Downloads media from a source URL and uploads it to Supabase Storage.
 * Returns the public URL on success, or null on failure.
 */
export async function persistMedia(
  sourceUrl: string,
  adId: string,
  type: 'thumbnail' | 'video'
): Promise<{ publicUrl: string } | null> {
  try {
    // Idempotency: skip if already persisted to Supabase Storage
    if (isSupabaseStorageUrl(sourceUrl)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: type === 'video' ? 'video/*,*/*' : 'image/*,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.facebook.com/',
        },
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`Failed to download ${type} for ad ${adId}: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const ext = CONTENT_TYPE_TO_EXT[contentType.split(';')[0].trim()] || (type === 'video' ? 'mp4' : 'jpg');
    const folder = type === 'thumbnail' ? 'thumbnails' : 'videos';
    const path = `${folder}/${adId}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log(`[storage] Uploading ${type} for ad ${adId}: ${bytes.byteLength} bytes, content-type=${contentType.split(';')[0].trim()}`);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: contentType.split(';')[0].trim(),
        upsert: true,
        cacheControl: '31536000',
      });

    if (error) {
      console.error(`Failed to upload ${type} for ad ${adId}:`, error.message, JSON.stringify(error));
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: urlData.publicUrl };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.error(`[storage] Download timeout (${DOWNLOAD_TIMEOUT_MS}ms) for ${type} ad ${adId}`);
    } else {
      console.error(`Error persisting ${type} for ad ${adId}:`, err);
    }
    return null;
  }
}

/**
 * Processes an array of transformed ads, uploading media to Supabase Storage
 * and writing the persisted URLs back to the `ads` table.
 *
 * Since this runs in the background (after the response is sent),
 * the client already upserted ads with the original fbcdn URLs.
 * We update `thumbnail_url` / `video_url` directly in the DB.
 */
export async function persistAllMedia(
  ads: Ad[],
  concurrency = 5
): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (let i = 0; i < ads.length; i += concurrency) {
    const batch = ads.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ad) => {
        const dbUpdate: Record<string, string> = {};

        // Persist thumbnail
        if (ad.thumbnail && ad.thumbnail.startsWith('http') && !isSupabaseStorageUrl(ad.thumbnail)) {
          const result = await persistMedia(ad.thumbnail, ad.id, 'thumbnail');
          if (result) {
            ad.thumbnail = result.publicUrl;
            dbUpdate.thumbnail_url = result.publicUrl;
          }
        }

        // Persist video
        if (ad.videoUrl && ad.videoUrl.startsWith('http') && !isSupabaseStorageUrl(ad.videoUrl)) {
          const result = await persistMedia(ad.videoUrl, ad.id, 'video');
          if (result) {
            ad.videoUrl = result.publicUrl;
            dbUpdate.video_url = result.publicUrl;
          }
        }

        // Write persisted URLs back to the database
        if (Object.keys(dbUpdate).length > 0) {
          const { error } = await supabase
            .from('ads')
            .update(dbUpdate)
            .eq('id', ad.id);

          if (error) {
            console.error(`[storage] Failed to update DB for ad ${ad.id}:`, error.message);
          } else {
            console.log(`[storage] Updated DB for ad ${ad.id}:`, Object.keys(dbUpdate).join(', '));
          }
        }
      })
    );
  }
}
