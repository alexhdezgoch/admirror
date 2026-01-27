import { ApifyAd } from '@/types/apify';
import { Ad, AdFormat, HookType } from '@/types';
import { scoreAd } from '@/lib/scoring';

// Helper to get nested property safely with multiple possible paths
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getField(obj: any, ...paths: string[]): any {
  for (const path of paths) {
    const keys = path.split('.');
    let value = obj;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Detect ad format from Apify response (handles multiple actor formats)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function detectFormat(apifyAd: any): AdFormat {
  // Check display_format field (curious_coder format)
  const displayFormat = apifyAd?.snapshot?.display_format?.toUpperCase();
  if (displayFormat === 'VIDEO') return 'video';
  if (displayFormat === 'CAROUSEL' || displayFormat === 'DCO') return 'carousel';

  // Check for videos in snapshot
  const snapshotVideos = apifyAd?.snapshot?.videos || [];
  if (Array.isArray(snapshotVideos) && snapshotVideos.length > 0) return 'video';

  // Check for multiple images (carousel)
  const snapshotImages = apifyAd?.snapshot?.images || [];
  if (Array.isArray(snapshotImages) && snapshotImages.length > 1) return 'carousel';

  // Try cards structure
  const cards = apifyAd.snapshot?.cards || [];
  const hasVideoInCards = cards.some((c: any) => c.video_hd_url || c.video_sd_url || c.video_url);
  if (hasVideoInCards) return 'video';
  if (cards.length > 1) return 'carousel';

  // Root level videos/images
  const videos = apifyAd.videos || apifyAd.video || [];
  const hasVideo = Array.isArray(videos) ? videos.length > 0 : !!videos;
  if (hasVideo) return 'video';

  return 'static';
}

/**
 * Detect hook type from ad text
 */
export function detectHookType(text: string): HookType {
  if (!text) return 'statement';

  // Check for question
  if (text.includes('?')) return 'question';

  // Check for social proof patterns
  if (/\d+%|\d+\s*(people|customers|users)|testimonial|reviews?|rated|trusted/i.test(text)) {
    return 'social_proof';
  }

  // Check for urgency patterns
  // Note: "now" and "today" only count as urgency when preceded by action verbs
  // to avoid false positives like "designed for today" or "now more than ever"
  const urgencyPatterns = [
    /\blimited\b/i,
    /\bhurry\b/i,
    /\b(last\s*(chance|day|call))\b/i,
    /\b(ending|ends)\b/i,
    /\bexpires?\b/i,
    /\bonly\s*\d+\s*(left|remaining|available)?\b/i,
    /\bdon'?t\s*miss\b/i,
    /\b(order|buy|shop|get|act|call|sign\s*up|register|subscribe|start|try|grab|claim)\s+(now|today)\b/i,
    /\b(now|today)\s+only\b/i,
    /\bends?\s+(now|today)\b/i,
    /\b(offer|sale|deal|discount)\s+(ends?|expires?)\b/i,
  ];

  if (urgencyPatterns.some(pattern => pattern.test(text))) {
    return 'urgency';
  }

  return 'statement';
}

/**
 * Calculate days since ad started running
 */
export function calculateDaysActive(startDate: number | string | undefined): number {
  if (!startDate) return 0;

  let startTimestamp: number;

  if (typeof startDate === 'number') {
    // Unix timestamp in seconds - convert to milliseconds
    startTimestamp = startDate * 1000;
  } else {
    // ISO date string
    startTimestamp = new Date(startDate).getTime();
  }

  const now = Date.now();
  const diffMs = now - startTimestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Check if text is a template placeholder (e.g., {{product.name}})
 */
function isTemplatePlaceholder(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  return trimmed.startsWith('{{') || /\{\{[^}]+\}\}/.test(trimmed);
}

/**
 * Clean and validate text - returns empty string if it's a template or invalid
 */
function cleanText(text: string | undefined): string {
  if (!text || typeof text !== 'string') return '';
  const cleaned = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (isTemplatePlaceholder(cleaned)) return '';
  return cleaned;
}

/**
 * Extract hook text (first line of body) - handles multiple actor formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractHookText(apifyAd: any): string {
  const adId = apifyAd?.ad_archive_id || apifyAd?.id || 'unknown';
  const cards = apifyAd?.snapshot?.cards;

  console.log('[extractHookText] Attempting extraction for ad:', adId);

  // PRIORITY 1: Check cards array for DCO/DPA/CAROUSEL - body first
  if (Array.isArray(cards) && cards.length > 0) {
    const cardBody = cleanText(cards[0]?.body);
    if (cardBody) {
      console.log('[extractHookText] SUCCESS: Found cards[0].body');
      const firstSentence = cardBody.split(/[.!?]/)[0];
      return firstSentence.slice(0, 150).trim();
    }

    // Fallback to card title (common in DCO ads)
    const cardTitle = cleanText(cards[0]?.title);
    if (cardTitle) {
      console.log('[extractHookText] SUCCESS: Found cards[0].title');
      return cardTitle.slice(0, 150).trim();
    }

    // Fallback to card link_description
    const cardLinkDesc = cleanText(cards[0]?.link_description);
    if (cardLinkDesc) {
      console.log('[extractHookText] SUCCESS: Found cards[0].link_description');
      return cardLinkDesc.slice(0, 150).trim();
    }
  }

  // PRIORITY 2: Try snapshot-level body.text (but skip templates)
  let bodyText = apifyAd?.snapshot?.body?.text;
  if (bodyText && typeof bodyText === 'string') {
    bodyText = cleanText(bodyText);
    if (bodyText) {
      console.log('[extractHookText] SUCCESS: Found snapshot.body.text');
      const firstSentence = bodyText.split(/[.!?]/)[0];
      return firstSentence.slice(0, 150).trim();
    }
  }

  // PRIORITY 3: Try other paths
  const paths = [
    'snapshot.body.markup.__html',
    'snapshot.caption',
    'ad_creative_bodies.0',
    'body.text',
    'body',
    'bodyText',
    'text',
    'caption',
    'description'
  ];

  for (const path of paths) {
    const value = getField(apifyAd, path);
    const cleaned = cleanText(typeof value === 'object' && value?.text ? value.text : value);
    if (cleaned) {
      console.log('[extractHookText] SUCCESS: Found via path:', path);
      const firstSentence = cleaned.split(/[.!?]/)[0];
      return firstSentence.slice(0, 150).trim();
    }
  }

  // PRIORITY 4: Snapshot-level title/link_description (skip templates)
  const snapshotTitle = cleanText(apifyAd?.snapshot?.title);
  if (snapshotTitle) {
    console.log('[extractHookText] SUCCESS: Found snapshot.title');
    return snapshotTitle.slice(0, 150).trim();
  }

  const snapshotLinkDesc = cleanText(apifyAd?.snapshot?.link_description);
  if (snapshotLinkDesc) {
    console.log('[extractHookText] SUCCESS: Found snapshot.link_description');
    return snapshotLinkDesc.slice(0, 150).trim();
  }

  console.log('[extractHookText] FAILED: No valid text found (all were empty or templates)');
  return '';
}

/**
 * Extract primary text (full body) - handles multiple actor formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractPrimaryText(apifyAd: any): string {
  const adId = apifyAd?.ad_archive_id || apifyAd?.id || 'unknown';
  const cards = apifyAd?.snapshot?.cards;

  console.log('[extractPrimaryText] Attempting extraction for ad:', adId);

  // PRIORITY 1: Check cards array for DCO/DPA/CAROUSEL - body first
  if (Array.isArray(cards) && cards.length > 0) {
    const cardBody = cleanText(cards[0]?.body);
    if (cardBody) {
      console.log('[extractPrimaryText] SUCCESS: Found cards[0].body');
      return cardBody;
    }

    // Fallback to card title (common in DCO ads)
    const cardTitle = cleanText(cards[0]?.title);
    if (cardTitle) {
      console.log('[extractPrimaryText] SUCCESS: Found cards[0].title');
      return cardTitle;
    }

    // Fallback to card link_description
    const cardLinkDesc = cleanText(cards[0]?.link_description);
    if (cardLinkDesc) {
      console.log('[extractPrimaryText] SUCCESS: Found cards[0].link_description');
      return cardLinkDesc;
    }
  }

  // PRIORITY 2: Try snapshot-level body.text (but skip templates)
  let bodyText = apifyAd?.snapshot?.body?.text;
  if (bodyText && typeof bodyText === 'string') {
    bodyText = cleanText(bodyText);
    if (bodyText) {
      console.log('[extractPrimaryText] SUCCESS: Found snapshot.body.text');
      return bodyText;
    }
  }

  // PRIORITY 3: Try other paths
  const paths = [
    'snapshot.body.markup.__html',
    'snapshot.caption',
    'ad_creative_bodies.0',
    'body.text',
    'body',
    'bodyText',
    'text',
    'caption',
    'description'
  ];

  for (const path of paths) {
    const value = getField(apifyAd, path);
    const cleaned = cleanText(typeof value === 'object' && value?.text ? value.text : value);
    if (cleaned) {
      console.log('[extractPrimaryText] SUCCESS: Found via path:', path);
      return cleaned;
    }
  }

  // PRIORITY 4: Snapshot-level title/link_description (skip templates)
  const snapshotTitle = cleanText(apifyAd?.snapshot?.title);
  if (snapshotTitle) {
    console.log('[extractPrimaryText] SUCCESS: Found snapshot.title');
    return snapshotTitle;
  }

  const snapshotLinkDesc = cleanText(apifyAd?.snapshot?.link_description);
  if (snapshotLinkDesc) {
    console.log('[extractPrimaryText] SUCCESS: Found snapshot.link_description');
    return snapshotLinkDesc;
  }

  console.log('[extractPrimaryText] FAILED: No valid text found (all were empty or templates)');
  return '';
}

/**
 * Get thumbnail URL from Apify ad - handles multiple actor formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getThumbnail(apifyAd: any): string {
  const displayFormat = apifyAd?.snapshot?.display_format?.toUpperCase();
  const cards = apifyAd?.snapshot?.cards || [];
  const snapshotImages = apifyAd?.snapshot?.images || [];
  const snapshotVideos = apifyAd?.snapshot?.videos || [];

  console.log(`getThumbnail: format=${displayFormat}, images=${snapshotImages.length}, videos=${snapshotVideos.length}, cards=${cards.length}`);

  // PRIORITY 1: For DCO/DPA/CAROUSEL, check cards array first
  if (Array.isArray(cards) && cards.length > 0) {
    const firstCard = cards[0];
    // Check for video preview first (for video cards)
    if (firstCard?.video_preview_image_url) {
      console.log('Using cards[0].video_preview_image_url');
      return firstCard.video_preview_image_url;
    }
    // Then check for images in cards
    if (firstCard?.resized_image_url) {
      console.log('Using cards[0].resized_image_url');
      return firstCard.resized_image_url;
    }
    if (firstCard?.image_url) {
      console.log('Using cards[0].image_url');
      return firstCard.image_url;
    }
  }

  // PRIORITY 2: For VIDEO format, check snapshot.videos
  if (displayFormat === 'VIDEO' || snapshotVideos.length > 0) {
    if (Array.isArray(snapshotVideos) && snapshotVideos.length > 0) {
      const firstVideo = snapshotVideos[0];
      if (firstVideo?.video_preview_image_url) return firstVideo.video_preview_image_url;
      if (firstVideo?.preview_image_url) return firstVideo.preview_image_url;
      if (firstVideo?.thumbnail_url) return firstVideo.thumbnail_url;
      if (firstVideo?.resized_image_url) return firstVideo.resized_image_url;
    }
  }

  // PRIORITY 3: Check snapshot.images for IMAGE format
  if (Array.isArray(snapshotImages) && snapshotImages.length > 0) {
    const firstImage = snapshotImages[0];
    if (firstImage?.resized_image_url) return firstImage.resized_image_url;
    if (firstImage?.original_image_url) return firstImage.original_image_url;
  }

  // PRIORITY 4: Root level images
  const images = apifyAd?.images;
  if (Array.isArray(images) && images.length > 0) {
    const firstImage = images[0];
    if (typeof firstImage === 'string' && firstImage.startsWith('http')) {
      return firstImage;
    }
    if (firstImage?.resized_image_url) return firstImage.resized_image_url;
    if (firstImage?.original_image_url) return firstImage.original_image_url;
  }

  // FALLBACK: Page profile picture (logo)
  const pageProfilePic = apifyAd?.snapshot?.page_profile_picture_url;
  if (pageProfilePic && pageProfilePic.startsWith('http')) {
    console.log('Using page_profile_picture_url as fallback');
    return pageProfilePic;
  }

  return '/api/placeholder/300/300';
}

/**
 * Generate creative elements description from ad content - handles multiple formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateCreativeElements(apifyAd: any): string[] {
  const elements: string[] = [];
  const format = detectFormat(apifyAd);

  // Add format indicator
  const images = apifyAd.images || [];
  const imageCount = Array.isArray(images) ? images.length : 0;

  if (format === 'video') {
    elements.push('Video creative');
  } else if (format === 'carousel' || imageCount > 1) {
    elements.push(`${imageCount || 'Multi'}-card carousel`);
  } else {
    elements.push('Static image');
  }

  // Check for CTA
  const ctaText = getField(apifyAd,
    'snapshot.cards.0.cta_text',
    'snapshot.cta_text',
    'cta_text',
    'ctaText',
    'cta',
    'callToAction'
  );
  if (ctaText) {
    elements.push(`CTA: ${ctaText}`);
  }

  // Analyze body text for common elements
  const bodyText = extractPrimaryText(apifyAd).toLowerCase();

  if (/free\s*(shipping|trial|sample)/i.test(bodyText)) {
    elements.push('Free offer');
  }
  if (/discount|%\s*off|save\s*\$/i.test(bodyText)) {
    elements.push('Discount promotion');
  }
  if (/testimonial|said|told|review/i.test(bodyText)) {
    elements.push('Testimonial');
  }
  if (/before\s*(and\s*)?after/i.test(bodyText)) {
    elements.push('Before/After');
  }

  return elements;
}

/**
 * Check if a URL looks like an image (not a video)
 */
function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('.jpg') || lower.includes('.jpeg') ||
         lower.includes('.png') || lower.includes('.gif') ||
         lower.includes('.webp');
}

/**
 * Get video URL from Apify ad - handles multiple actor formats
 * Priority: video_hd_url → video_sd_url → snapshot.videos[0].video_hd_url
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getVideoUrl(apifyAd: any): string | undefined {
  const adId = apifyAd?.ad_archive_id || apifyAd?.id || 'unknown';

  // PRIORITY 1: Root level video URLs (from some actors)
  if (apifyAd?.video_hd_url && typeof apifyAd.video_hd_url === 'string' && !isImageUrl(apifyAd.video_hd_url)) {
    console.log(`[getVideoUrl] ${adId}: Found root video_hd_url`);
    return apifyAd.video_hd_url;
  }
  if (apifyAd?.video_sd_url && typeof apifyAd.video_sd_url === 'string' && !isImageUrl(apifyAd.video_sd_url)) {
    console.log(`[getVideoUrl] ${adId}: Found root video_sd_url`);
    return apifyAd.video_sd_url;
  }

  // PRIORITY 2: Check snapshot.videos array
  const snapshotVideos = apifyAd?.snapshot?.videos || [];
  if (Array.isArray(snapshotVideos) && snapshotVideos.length > 0) {
    const firstVideo = snapshotVideos[0];
    console.log(`[getVideoUrl] ${adId}: snapshot.videos[0] keys:`, Object.keys(firstVideo || {}));
    // Check unwatermarked URLs first (preferred)
    if (firstVideo?.video_hd_url && !isImageUrl(firstVideo.video_hd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found snapshot.videos[0].video_hd_url`);
      return firstVideo.video_hd_url;
    }
    if (firstVideo?.video_sd_url && !isImageUrl(firstVideo.video_sd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found snapshot.videos[0].video_sd_url`);
      return firstVideo.video_sd_url;
    }
    if (firstVideo?.video_url && !isImageUrl(firstVideo.video_url)) {
      console.log(`[getVideoUrl] ${adId}: Found snapshot.videos[0].video_url`);
      return firstVideo.video_url;
    }
    // Fallback to watermarked URLs if no clean version available
    if (firstVideo?.watermarked_video_hd_url && !isImageUrl(firstVideo.watermarked_video_hd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found snapshot.videos[0].watermarked_video_hd_url`);
      return firstVideo.watermarked_video_hd_url;
    }
    if (firstVideo?.watermarked_video_sd_url && !isImageUrl(firstVideo.watermarked_video_sd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found snapshot.videos[0].watermarked_video_sd_url`);
      return firstVideo.watermarked_video_sd_url;
    }
  }

  // PRIORITY 3: Check cards array for video URLs (carousel with video)
  const cards = apifyAd?.snapshot?.cards || [];
  if (Array.isArray(cards) && cards.length > 0) {
    const firstCard = cards[0];
    // Check unwatermarked URLs first (preferred)
    if (firstCard?.video_hd_url && !isImageUrl(firstCard.video_hd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found cards[0].video_hd_url`);
      return firstCard.video_hd_url;
    }
    if (firstCard?.video_sd_url && !isImageUrl(firstCard.video_sd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found cards[0].video_sd_url`);
      return firstCard.video_sd_url;
    }
    if (firstCard?.video_url && !isImageUrl(firstCard.video_url)) {
      console.log(`[getVideoUrl] ${adId}: Found cards[0].video_url`);
      return firstCard.video_url;
    }
    // Fallback to watermarked URLs if no clean version available
    if (firstCard?.watermarked_video_hd_url && !isImageUrl(firstCard.watermarked_video_hd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found cards[0].watermarked_video_hd_url`);
      return firstCard.watermarked_video_hd_url;
    }
    if (firstCard?.watermarked_video_sd_url && !isImageUrl(firstCard.watermarked_video_sd_url)) {
      console.log(`[getVideoUrl] ${adId}: Found cards[0].watermarked_video_sd_url`);
      return firstCard.watermarked_video_sd_url;
    }
  }

  // Log if this is a video ad but no URL found
  const isVideoFormat = apifyAd?.snapshot?.display_format === 'VIDEO' || snapshotVideos.length > 0;
  if (isVideoFormat) {
    console.log(`[getVideoUrl] ${adId}: VIDEO ad but no video URL found!`);
    console.log(`[getVideoUrl] ${adId}: snapshot.videos:`, JSON.stringify(snapshotVideos, null, 2));
    console.log(`[getVideoUrl] ${adId}: cards:`, JSON.stringify(cards?.slice(0, 1), null, 2));
  }

  return undefined;
}

/**
 * Convert launch date to ISO string
 */
export function formatLaunchDate(startDate: number | string | undefined): string {
  if (!startDate) return new Date().toISOString();

  if (typeof startDate === 'number') {
    // Unix timestamp in seconds
    return new Date(startDate * 1000).toISOString();
  }

  return new Date(startDate).toISOString();
}

/**
 * Get competitor logo from Apify ad (fallback to emoji)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getCompetitorLogo(apifyAd: any): string {
  const name = getField(apifyAd, 'page_name', 'pageName', 'advertiser', 'advertiserName', 'pageInfo.name') || 'Unknown';
  const firstLetter = String(name).charAt(0).toUpperCase();
  return firstLetter;
}

/**
 * Transform a single Apify ad to the app's Ad format - handles multiple actor formats
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformApifyAd(
  apifyAd: any,
  clientBrandId: string,
  competitorId: string,
  isClientAd: boolean = false
): Ad {
  // Extract fields with multiple possible paths
  const adId = getField(apifyAd,
    'ad_archive_id',
    'adArchiveId',
    'id',
    'adId',
    'ad_id',
    'archiveId'
  ) || `ad-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const pageName = getField(apifyAd,
    'page_name',
    'pageName',
    'advertiser',
    'advertiserName',
    'pageInfo.name',
    'page.name'
  ) || 'Unknown';

  const startDate = getField(apifyAd,
    'start_date',
    'startDate',
    'ad_delivery_start_time',
    'adDeliveryStartTime',
    'startTime',
    'start_time',
    'createdAt',
    'created_at',
    'launchDate',
    'launch_date'
  );

  const collationCount = getField(apifyAd,
    'collation_count',
    'collationCount',
    'variationCount',
    'variation_count',
    'versions',
    'variantCount'
  );

  // First, directly check cards array for headline (DCO/DPA/CAROUSEL)
  const cards = apifyAd?.snapshot?.cards;
  let headline = '';
  if (Array.isArray(cards) && cards.length > 0) {
    const firstCard = cards[0];
    headline = firstCard?.link_description || firstCard?.title || firstCard?.link_title || '';
    if (headline) {
      console.log('headline: Found in cards[0]');
    }
  }

  // Fallback to other paths
  if (!headline) {
    headline = getField(apifyAd,
      'snapshot.title',              // main title for DCO/DPA/CAROUSEL
      'snapshot.link_title',         // link title
      'snapshot.link_description',   // curious_coder format
      'snapshot.caption',
      'ad_creative_link_titles.0',
      'title',
      'headline',
      'adTitle',
      'ad_title'
    ) || '';
  }

  const ctaText = getField(apifyAd,
    'snapshot.cta_text',           // curious_coder format
    'snapshot.cards.0.cta_text',
    'cta_text',
    'ctaText',
    'cta',
    'callToAction',
    'call_to_action'
  ) || '';

  const format = detectFormat(apifyAd);
  const daysActive = calculateDaysActive(startDate);
  const variationCount = collationCount ?? 1;
  const hookText = extractHookText(apifyAd);
  const hookType = detectHookType(hookText);
  const primaryText = extractPrimaryText(apifyAd);
  const creativeElements = generateCreativeElements(apifyAd);

  // Calculate scoring
  const scoring = scoreAd(daysActive, variationCount, hookType, format, creativeElements);

  // Get video URL for video ads
  const videoUrl = format === 'video' ? getVideoUrl(apifyAd) : undefined;

  return {
    id: String(adId),
    clientBrandId,
    competitorId,
    competitorName: String(pageName),
    competitorLogo: getCompetitorLogo(apifyAd),
    thumbnail: getThumbnail(apifyAd),
    format,
    daysActive,
    variationCount,
    launchDate: formatLaunchDate(startDate),
    hookText,
    hookType,
    headline: String(headline),
    primaryText,
    cta: String(ctaText),
    isVideo: format === 'video',
    videoDuration: undefined,
    videoUrl,
    creativeElements,
    inSwipeFile: false,
    scoring,
    isActive: true,
    lastSeenAt: new Date().toISOString(),
    isClientAd
  };
}

/**
 * Transform multiple Apify ads - with logging for debugging
 */
export function transformApifyAds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apifyAds: any[],
  clientBrandId: string,
  competitorId: string,
  isClientAd: boolean = false
): Ad[] {
  console.log('=== TRANSFORM DEBUG START ===');
  console.log('Total ads to transform:', apifyAds.length);

  // Log first ad structure for debugging - FULL structure
  if (apifyAds.length > 0) {
    console.log('=== FIRST AD FULL STRUCTURE ===');
    console.log('[Transform] Full ad structure:', JSON.stringify(apifyAds[0], null, 2));
    console.log('=== END FIRST AD STRUCTURE ===');

    console.log('First raw ad keys:', Object.keys(apifyAds[0]));
    console.log('First raw ad snapshot keys:', Object.keys(apifyAds[0]?.snapshot || {}));

    // Log body-related fields specifically
    console.log('=== BODY FIELD DEBUG ===');
    console.log('snapshot.body:', apifyAds[0]?.snapshot?.body);
    console.log('snapshot.body type:', typeof apifyAds[0]?.snapshot?.body);
    console.log('snapshot.caption:', apifyAds[0]?.snapshot?.caption);
    console.log('ad_creative_bodies:', apifyAds[0]?.ad_creative_bodies);
    console.log('snapshot.cards:', apifyAds[0]?.snapshot?.cards?.length || 0, 'cards');
    if (apifyAds[0]?.snapshot?.cards?.[0]) {
      console.log('First card keys:', Object.keys(apifyAds[0].snapshot.cards[0]));
      console.log('First card body:', apifyAds[0].snapshot.cards[0].body);
    }

    // Log video ads specifically
    const videoAds = apifyAds.filter(ad =>
      ad.snapshot?.display_format === 'VIDEO' ||
      (ad.snapshot?.videos && ad.snapshot.videos.length > 0)
    );
    if (videoAds.length > 0) {
      console.log('=== VIDEO AD DEBUG ===');
      console.log('Video ads count:', videoAds.length);
      console.log('First video ad display_format:', videoAds[0]?.snapshot?.display_format);

      // Log all video URL fields from snapshot.videos
      const firstVideoData = videoAds[0]?.snapshot?.videos?.[0];
      if (firstVideoData) {
        console.log('=== VIDEO URL FIELDS (snapshot.videos[0]) ===');
        console.log('video_hd_url:', firstVideoData.video_hd_url || 'NOT SET');
        console.log('video_sd_url:', firstVideoData.video_sd_url || 'NOT SET');
        console.log('video_url:', firstVideoData.video_url || 'NOT SET');
        console.log('watermarked_video_hd_url:', firstVideoData.watermarked_video_hd_url || 'NOT SET');
        console.log('watermarked_video_sd_url:', firstVideoData.watermarked_video_sd_url || 'NOT SET');
        console.log('video_preview_image_url:', firstVideoData.video_preview_image_url || 'NOT SET');
        console.log('All keys in snapshot.videos[0]:', Object.keys(firstVideoData));
      }

      // Log all video URL fields from cards
      const firstCardData = videoAds[0]?.snapshot?.cards?.[0];
      if (firstCardData) {
        console.log('=== VIDEO URL FIELDS (cards[0]) ===');
        console.log('video_hd_url:', firstCardData.video_hd_url || 'NOT SET');
        console.log('video_sd_url:', firstCardData.video_sd_url || 'NOT SET');
        console.log('video_url:', firstCardData.video_url || 'NOT SET');
        console.log('watermarked_video_hd_url:', firstCardData.watermarked_video_hd_url || 'NOT SET');
        console.log('watermarked_video_sd_url:', firstCardData.watermarked_video_sd_url || 'NOT SET');
        console.log('All keys in cards[0]:', Object.keys(firstCardData));
      }

      console.log('Full snapshot.videos:', JSON.stringify(videoAds[0]?.snapshot?.videos, null, 2));
    }
  }

  const transformedAds = apifyAds.map(ad => transformApifyAd(ad, clientBrandId, competitorId, isClientAd));

  // Log summary of ads with missing copy
  const adsWithEmptyHook = transformedAds.filter(ad => !ad.hookText);
  const adsWithEmptyPrimary = transformedAds.filter(ad => !ad.primaryText);
  const adsWithEmptyHeadline = transformedAds.filter(ad => !ad.headline);

  // Add format breakdown
  const formatCounts = transformedAds.reduce((acc, ad) => {
    acc[ad.format] = (acc[ad.format] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Check video URL extraction
  const videoAdsTransformed = transformedAds.filter(ad => ad.format === 'video');
  const videoAdsWithUrl = videoAdsTransformed.filter(ad => ad.videoUrl);
  const videoAdsWithoutUrl = videoAdsTransformed.filter(ad => !ad.videoUrl);

  console.log('=== TRANSFORM RESULTS SUMMARY ===');
  console.log('Total transformed:', transformedAds.length);
  console.log('Format breakdown:', formatCounts);
  console.log('Video ads:', videoAdsTransformed.map(ad => ad.id));
  console.log('Video ads WITH videoUrl:', videoAdsWithUrl.length, videoAdsWithUrl.map(ad => ({ id: ad.id, videoUrl: ad.videoUrl?.slice(0, 50) + '...' })));
  console.log('Video ads WITHOUT videoUrl:', videoAdsWithoutUrl.length, videoAdsWithoutUrl.map(ad => ad.id));
  console.log('Ads with empty hookText:', adsWithEmptyHook.length);
  console.log('Ads with empty primaryText:', adsWithEmptyPrimary.length);
  console.log('Ads with empty headline:', adsWithEmptyHeadline.length);

  if (adsWithEmptyHook.length > 0) {
    console.log('=== SAMPLE ADS WITH EMPTY HOOK ===');
    adsWithEmptyHook.slice(0, 3).forEach((ad, i) => {
      console.log(`Empty hook ad ${i + 1}:`, {
        id: ad.id,
        competitorName: ad.competitorName,
        format: ad.format,
        headline: ad.headline,
        primaryText: ad.primaryText?.slice(0, 50) || 'EMPTY'
      });
    });
  }

  console.log('=== TRANSFORM DEBUG END ===');

  return transformedAds;
}
