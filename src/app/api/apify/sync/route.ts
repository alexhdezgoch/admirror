import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { fetchAdsFromApify, extractPageIdFromUrl } from '@/lib/apify/client';
import { transformApifyAds } from '@/lib/apify/transform';
import { persistAllMedia } from '@/lib/storage/media';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { runCombinedTaggingPipeline } from '@/lib/tagging/pipeline';

export const maxDuration = 300;

interface SyncRequestBody {
  clientBrandId: string;
  competitorId: string;
  competitorUrl?: string;
  competitorPageId?: string;
  competitorName?: string;
  competitorLogo?: string;
  maxResults?: number;
  isClientAd?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncRequestBody = await request.json();

    // Validate required fields
    if (!body.clientBrandId) {
      return NextResponse.json(
        { success: false, error: 'clientBrandId is required' },
        { status: 400 }
      );
    }

    if (!body.competitorId) {
      return NextResponse.json(
        { success: false, error: 'competitorId is required' },
        { status: 400 }
      );
    }

    if (!body.competitorUrl && !body.competitorPageId) {
      return NextResponse.json(
        { success: false, error: 'Either competitorUrl or competitorPageId is required' },
        { status: 400 }
      );
    }

    // Get API token from environment
    const apiToken = process.env.APIFY_API_TOKEN;
    if (!apiToken) {
      return NextResponse.json(
        { success: false, error: 'Apify API token is not configured. Add APIFY_API_TOKEN to your environment variables.' },
        { status: 500 }
      );
    }

    // Extract page ID if URL provided
    let pageId = body.competitorPageId;
    if (!pageId && body.competitorUrl) {
      pageId = extractPageIdFromUrl(body.competitorUrl) || undefined;
    }

    if (!pageId) {
      return NextResponse.json(
        { success: false, error: 'Could not extract page ID from the provided URL. Please ensure the URL contains a view_all_page_id parameter.' },
        { status: 400 }
      );
    }

    // --- Resolve competitor_id for client ads ---
    const adminClient = getSupabaseAdmin();
    const isClientAd = body.isClientAd || false;
    let competitorId = body.competitorId;

    if (isClientAd && competitorId === 'client') {
      // Look for an existing self-competitor for this brand
      const { data: existing, error: findError } = await adminClient
        .from('competitors')
        .select('id')
        .eq('brand_id', body.clientBrandId)
        .ilike('name', '%(Your Ads)%')
        .maybeSingle();

      if (findError) {
        console.error('Error finding self-competitor:', findError);
        return NextResponse.json(
          { success: false, error: 'Failed to resolve self-competitor' },
          { status: 500 }
        );
      }

      if (existing) {
        competitorId = existing.id;
      } else {
        // Create a self-competitor
        const { data: created, error: createError } = await adminClient
          .from('competitors')
          .insert({
            brand_id: body.clientBrandId,
            user_id: user.id,
            name: `${body.competitorName || 'My Brand'} (Your Ads)`,
            logo: body.competitorLogo || '',
            url: body.competitorUrl || null,
            total_ads: 0,
            avg_ads_per_week: 0,
          })
          .select('id')
          .single();

        if (createError || !created) {
          console.error('Error creating self-competitor:', createError);
          return NextResponse.json(
            { success: false, error: 'Failed to create self-competitor' },
            { status: 500 }
          );
        }
        competitorId = created.id;
      }
    }

    // Look up canonical competitor name from database
    let canonicalCompetitorName: string | null = null;
    if (competitorId && competitorId !== 'client') {
      const { data: comp } = await adminClient
        .from('competitors')
        .select('name')
        .eq('id', competitorId)
        .single();
      canonicalCompetitorName = comp?.name || null;
    }

    // Fetch ads from Apify
    const result = await fetchAdsFromApify(
      {
        pageId,
        adLibraryUrl: body.competitorUrl,
        maxResults: body.maxResults || 1000
      },
      {
        apiToken,
        maxResults: body.maxResults || 1000
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error?.message || 'Failed to fetch ads from Apify' },
        { status: 500 }
      );
    }

    // Debug: Log raw Apify response structure
    console.log('=== APIFY RAW RESPONSE ===');
    console.log('Number of ads:', result.ads.length);
    if (result.ads[0]) {
      console.log('First ad keys:', Object.keys(result.ads[0]));
      console.log('First ad full data:', JSON.stringify(result.ads[0], null, 2));
    }

    // Transform Apify ads to our Ad format
    const transformedAds = transformApifyAds(
      result.ads,
      body.clientBrandId,
      competitorId,
      isClientAd
    );

    // --- Fetch existing ads for this competitor ---
    const { data: existingAdsData, error: existingError } = await adminClient
      .from('ads')
      .select('id, is_active')
      .eq('competitor_id', competitorId);

    if (existingError) {
      console.error('Error fetching existing ads:', existingError);
    }

    const existingAdIds = new Set((existingAdsData || []).map(ad => String(ad.id)));
    const existingActiveIds = new Set(
      (existingAdsData || []).filter(ad => ad.is_active !== false).map(ad => String(ad.id))
    );

    // --- Build upsert rows ---
    const now = new Date().toISOString();
    let newAdsCount = 0;
    let updatedAdsCount = 0;

    const adsToUpsert = transformedAds.map(ad => {
      const adId = String(ad.id);
      if (!existingAdIds.has(adId)) {
        newAdsCount++;
      } else {
        updatedAdsCount++;
      }

      return {
        id: adId,
        user_id: user.id,
        client_brand_id: body.clientBrandId,
        competitor_id: competitorId,
        competitor_name: canonicalCompetitorName || ad.competitorName,
        competitor_logo: ad.competitorLogo,
        format: ad.format,
        days_active: ad.daysActive,
        variation_count: ad.variationCount,
        launch_date: ad.launchDate.split('T')[0],
        hook_text: ad.hookText,
        headline: ad.headline,
        primary_text: ad.primaryText,
        cta: ad.cta,
        hook_type: ad.hookType,
        is_video: ad.isVideo,
        video_duration: ad.videoDuration || null,
        creative_elements: ad.creativeElements,
        in_swipe_file: false,
        scoring: JSON.parse(JSON.stringify(ad.scoring)),
        thumbnail_url: ad.thumbnail,
        video_url: ad.videoUrl || null,
        is_active: true,
        is_client_ad: isClientAd,
        last_seen_at: now,
      };
    });

    // --- Deduplicate by ID ---
    const uniqueAdsMap = new Map<string, typeof adsToUpsert[0]>();
    adsToUpsert.forEach(ad => {
      uniqueAdsMap.set(ad.id, ad);
    });
    const uniqueAdsToUpsert = Array.from(uniqueAdsMap.values());

    console.log(`[DEDUP] Before: ${adsToUpsert.length} ads, After: ${uniqueAdsToUpsert.length} unique ads`);

    // --- Upsert via admin client (bypasses RLS) ---
    console.log('[SYNC] Attempting upsert of', uniqueAdsToUpsert.length, 'ads');
    const { error: upsertError } = await adminClient
      .from('ads')
      .upsert(uniqueAdsToUpsert, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting ads:', JSON.stringify(upsertError, null, 2));
      console.error('[SYNC] Upsert error details:', {
        message: upsertError.message,
        code: upsertError.code,
        hint: upsertError.hint,
        details: upsertError.details,
      });
      return NextResponse.json(
        { success: false, error: `Failed to save ads to database: ${upsertError.message}` },
        { status: 500 }
      );
    }
    console.log('[SYNC] Upsert successful');

    // --- Backfill: fix any existing ads with mismatched competitor_name ---
    if (canonicalCompetitorName) {
      await adminClient
        .from('ads')
        .update({ competitor_name: canonicalCompetitorName })
        .eq('competitor_id', competitorId)
        .neq('competitor_name', canonicalCompetitorName);
    }

    // --- Archive ads that were active but not in the new fetch ---
    const maxResults = body.maxResults || 1000;
    const fetchedAdIds = new Set(transformedAds.map(ad => String(ad.id)));

    // Only archive if we got a complete picture (fetch returned fewer than max)
    const isCompleteFetch = transformedAds.length < maxResults;
    const adsToArchive = isCompleteFetch
      ? Array.from(existingActiveIds).filter(id => !fetchedAdIds.has(id))
      : [];
    let archivedAdsCount = 0;

    console.log('[SYNC DEBUG] Existing active IDs count:', existingActiveIds.size);
    console.log('[SYNC DEBUG] Fetched IDs count:', fetchedAdIds.size);
    console.log('[SYNC DEBUG] Ads to archive count:', adsToArchive.length);

    if (adsToArchive.length > 0) {
      const { error: archiveError } = await adminClient
        .from('ads')
        .update({ is_active: false })
        .in('id', adsToArchive);

      if (archiveError) {
        console.error('Error archiving ads:', archiveError);
        // Don't fail the request for archive errors
      } else {
        archivedAdsCount = adsToArchive.length;
        console.log(`[ARCHIVE] Archived ${archivedAdsCount} ads that are no longer active`);
      }
    }

    // --- Update competitor stats ---
    const { count: activeCount } = await adminClient
      .from('ads')
      .select('*', { count: 'exact', head: true })
      .eq('competitor_id', competitorId)
      .neq('is_active', false);

    const { error: statsError } = await adminClient
      .from('competitors')
      .update({
        total_ads: activeCount || uniqueAdsToUpsert.length,
        last_synced_at: now,
      })
      .eq('id', competitorId);

    if (statsError) {
      console.error('Error updating competitor stats:', statsError);
      // Don't fail the request for stats errors
    }

    // --- Schedule media persistence AFTER the upsert (rows exist now, no race) ---
    const adsWithMedia = transformedAds.filter(
      (ad) => (ad.thumbnail && ad.thumbnail.startsWith('http')) ||
              (ad.videoUrl && ad.videoUrl.startsWith('http'))
    );
    if (adsWithMedia.length > 0) {
      console.log(`[storage] Scheduling background persistAllMedia: ${adsWithMedia.length}/${transformedAds.length} ads`);
      waitUntil(
        persistAllMedia(transformedAds)
          .then(() => console.log('[storage] Background persistAllMedia completed'))
          .catch((err) => console.error('[storage] Background persistAllMedia failed:', err))
      );
    }

    // --- Schedule tagging for this brand's ads so reports work immediately ---
    waitUntil(
      runCombinedTaggingPipeline({ brandId: body.clientBrandId, skipDaysFilter: true })
        .then(stats => console.log('[SYNC] Auto-tagging complete:', stats))
        .catch(err => console.error('[SYNC] Auto-tagging failed:', err))
    );

    return NextResponse.json({
      success: true,
      ads: transformedAds,
      count: transformedAds.length,
      newAds: newAdsCount,
      updatedAds: updatedAdsCount,
      archivedAds: archivedAdsCount,
      competitorId,
    });

  } catch (error) {
    console.error('Error in Apify sync route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
