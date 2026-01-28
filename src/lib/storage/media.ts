import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Ad } from '@/types';

const BUCKET = 'ad-media';

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
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: type === 'video' ? 'video/*,*/*' : 'image/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://www.facebook.com/',
      },
    });

    if (!response.ok) {
      console.error(`Failed to download ${type} for ad ${adId}: HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const ext = CONTENT_TYPE_TO_EXT[contentType.split(';')[0].trim()] || (type === 'video' ? 'mp4' : 'jpg');
    const folder = type === 'thumbnail' ? 'thumbnails' : 'videos';
    const path = `${folder}/${adId}.${ext}`;

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: contentType.split(';')[0].trim(),
        upsert: true,
        cacheControl: '31536000',
      });

    if (error) {
      console.error(`Failed to upload ${type} for ad ${adId}:`, error.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { publicUrl: urlData.publicUrl };
  } catch (err) {
    console.error(`Error persisting ${type} for ad ${adId}:`, err);
    return null;
  }
}

/**
 * Processes an array of transformed ads, replacing fbcdn URLs with
 * permanent Supabase Storage URLs. Mutates ads in place.
 * On failure for any individual ad, the original URL is kept.
 */
export async function persistAllMedia(
  ads: Ad[],
  concurrency = 5
): Promise<void> {
  for (let i = 0; i < ads.length; i += concurrency) {
    const batch = ads.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ad) => {
        // Persist thumbnail
        if (ad.thumbnail && ad.thumbnail.startsWith('http')) {
          const result = await persistMedia(ad.thumbnail, ad.id, 'thumbnail');
          if (result) {
            ad.thumbnail = result.publicUrl;
          }
        }

        // Persist video
        if (ad.videoUrl && ad.videoUrl.startsWith('http')) {
          const result = await persistMedia(ad.videoUrl, ad.id, 'video');
          if (result) {
            ad.videoUrl = result.publicUrl;
          }
        }
      })
    );
  }
}
