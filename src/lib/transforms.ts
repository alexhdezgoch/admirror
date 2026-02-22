import { Ad, AdScore } from '@/types';
import { Tables } from '@/types/supabase';

export function dbAdToAd(dbAd: Tables<'ads'>): Ad {
  return {
    id: dbAd.id,
    clientBrandId: dbAd.client_brand_id,
    competitorId: dbAd.competitor_id || '',
    competitorName: dbAd.competitor_name || '',
    competitorLogo: dbAd.competitor_logo,
    thumbnail: dbAd.thumbnail_url || '',
    format: dbAd.format as Ad['format'],
    daysActive: dbAd.days_active,
    variationCount: dbAd.variation_count,
    launchDate: dbAd.launch_date,
    hookText: dbAd.hook_text || '',
    hookType: (dbAd.hook_type || 'statement') as Ad['hookType'],
    headline: dbAd.headline || '',
    primaryText: dbAd.primary_text || '',
    cta: dbAd.cta || '',
    isVideo: dbAd.is_video,
    videoDuration: dbAd.video_duration || undefined,
    videoUrl: dbAd.video_url || undefined,
    creativeElements: dbAd.creative_elements || [],
    inSwipeFile: dbAd.in_swipe_file,
    scoring: dbAd.scoring as unknown as AdScore,
    isActive: dbAd.is_active,
    lastSeenAt: dbAd.last_seen_at,
    isClientAd: dbAd.is_client_ad,
  };
}
