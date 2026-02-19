import { NextRequest, NextResponse } from 'next/server';
import { fetchAdsFromApify, extractPageIdFromUrl } from '@/lib/apify/client';
import { transformApifyAds } from '@/lib/apify/transform';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const maxDuration = 300;

interface SyncResult {
  competitorId: string;
  competitorName: string;
  brandName: string;
  success: boolean;
  newAds: number;
  updatedAds: number;
  archivedAds: number;
  error?: string;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const apiToken = process.env.APIFY_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: 'APIFY_API_TOKEN is not configured' },
      { status: 500 }
    );
  }

  const adminClient = getSupabaseAdmin();
  const results: SyncResult[] = [];
  let brandsProcessed = 0;
  let totalNewAds = 0;
  let totalErrors = 0;

  try {
    // Fetch all brands that have competitors
    const { data: brands, error: brandsError } = await adminClient
      .from('client_brands')
      .select('id, name, user_id');

    if (brandsError) {
      console.error('[CRON] Error fetching brands:', brandsError);
      return NextResponse.json(
        { error: 'Failed to fetch brands' },
        { status: 500 }
      );
    }

    if (!brands || brands.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No brands found',
        results: [],
      });
    }

    // Fetch all competitors across all brands (excluding self-competitors)
    const { data: competitors, error: competitorsError } = await adminClient
      .from('competitors')
      .select('id, name, logo, url, brand_id, user_id')
      .not('name', 'ilike', '%(Your Ads)%');

    if (competitorsError) {
      console.error('[CRON] Error fetching competitors:', competitorsError);
      return NextResponse.json(
        { error: 'Failed to fetch competitors' },
        { status: 500 }
      );
    }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No competitors found to sync',
        results: [],
      });
    }

    // Build brand lookup
    const brandMap = new Map(brands.map(b => [b.id, b]));

    // Filter to competitors with valid brands
    const validCompetitors = competitors.filter(c => brandMap.has(c.brand_id));
    console.log(`[CRON] Starting daily sync: ${brands.length} brands, ${validCompetitors.length} competitors (parallel, 3 at a time)`);

    // Process a single competitor — returns its SyncResult
    const syncCompetitor = async (competitor: typeof competitors[number]): Promise<SyncResult> => {
      const brand = brandMap.get(competitor.brand_id)!;
      const result: SyncResult = {
        competitorId: competitor.id,
        competitorName: competitor.name,
        brandName: brand.name,
        success: false,
        newAds: 0,
        updatedAds: 0,
        archivedAds: 0,
      };

      try {
        if (!competitor.url) {
          result.error = 'No URL configured';
          return result;
        }

        const pageId = extractPageIdFromUrl(competitor.url);
        if (!pageId) {
          result.error = 'Could not extract page ID from URL';
          return result;
        }

        const apifyResult = await fetchAdsFromApify(
          { pageId, adLibraryUrl: competitor.url, maxResults: 50 },
          { apiToken, maxResults: 50 }
        );

        if (!apifyResult.success) {
          result.error = apifyResult.error?.message || 'Apify fetch failed';
          console.error(`[CRON] Failed to sync ${competitor.name}: ${result.error}`);
          return result;
        }

        const transformedAds = transformApifyAds(
          apifyResult.ads,
          competitor.brand_id,
          competitor.id,
          false
        );

        const { data: existingAdsData } = await adminClient
          .from('ads')
          .select('id, is_active')
          .eq('competitor_id', competitor.id);

        const existingAdIds = new Set((existingAdsData || []).map(ad => String(ad.id)));
        const existingActiveIds = new Set(
          (existingAdsData || []).filter(ad => ad.is_active !== false).map(ad => String(ad.id))
        );

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
            user_id: competitor.user_id,
            client_brand_id: competitor.brand_id,
            competitor_id: competitor.id,
            competitor_name: ad.competitorName,
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
            is_client_ad: false,
            last_seen_at: now,
          };
        });

        const uniqueAdsMap = new Map<string, typeof adsToUpsert[0]>();
        adsToUpsert.forEach(ad => uniqueAdsMap.set(ad.id, ad));
        const uniqueAds = Array.from(uniqueAdsMap.values());

        const { error: upsertError } = await adminClient
          .from('ads')
          .upsert(uniqueAds, { onConflict: 'id' });

        if (upsertError) {
          result.error = `Upsert failed: ${upsertError.message}`;
          console.error(`[CRON] Upsert error for ${competitor.name}:`, upsertError);
          return result;
        }

        const fetchedAdIds = new Set(transformedAds.map(ad => String(ad.id)));
        const adsToArchive = Array.from(existingActiveIds).filter(id => !fetchedAdIds.has(id));
        let archivedCount = 0;

        if (adsToArchive.length > 0) {
          const { error: archiveError } = await adminClient
            .from('ads')
            .update({ is_active: false })
            .in('id', adsToArchive);

          if (!archiveError) {
            archivedCount = adsToArchive.length;
          }
        }

        await adminClient
          .from('competitors')
          .update({
            total_ads: uniqueAds.length,
            last_synced_at: now,
          })
          .eq('id', competitor.id);

        result.success = true;
        result.newAds = newAdsCount;
        result.updatedAds = updatedAdsCount;
        result.archivedAds = archivedCount;

        console.log(`[CRON] Synced ${competitor.name}: ${newAdsCount} new, ${updatedAdsCount} updated, ${archivedCount} archived`);
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[CRON] Error syncing ${competitor.name}:`, error);
      }

      return result;
    };

    // Process in parallel batches of 3
    const CONCURRENCY = 3;
    for (let i = 0; i < validCompetitors.length; i += CONCURRENCY) {
      const batch = validCompetitors.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(batch.map(syncCompetitor));
      for (const r of batchResults) {
        results.push(r);
        if (r.success) {
          brandsProcessed++;
          totalNewAds += r.newAds;
        } else {
          totalErrors++;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`[CRON] Daily sync complete in ${duration}s: ${brandsProcessed} competitors synced, ${totalNewAds} new ads, ${totalErrors} errors`);

    return NextResponse.json({
      success: true,
      summary: {
        competitorsSynced: brandsProcessed,
        competitorsFailed: totalErrors,
        totalNewAds,
        durationSeconds: Number(duration),
      },
      results,
    });
  } catch (error) {
    console.error('[CRON] Fatal error in daily sync:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        results,
      },
      { status: 500 }
    );
  }
}
