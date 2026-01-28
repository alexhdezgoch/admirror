import { NextRequest, NextResponse } from 'next/server';
import { fetchAdsFromApify, extractPageIdFromUrl } from '@/lib/apify/client';
import { transformApifyAds } from '@/lib/apify/transform';
import { persistAllMedia } from '@/lib/storage/media';
import { createClient } from '@/lib/supabase/server';

interface SyncRequestBody {
  clientBrandId: string;
  competitorId: string;
  competitorUrl?: string;
  competitorPageId?: string;
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

    // Fetch ads from Apify
    const result = await fetchAdsFromApify(
      {
        pageId,
        adLibraryUrl: body.competitorUrl,
        maxResults: body.maxResults || 50
      },
      {
        apiToken,
        maxResults: body.maxResults || 50
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
      body.competitorId,
      body.isClientAd || false
    );

    // Persist media to Supabase Storage (non-fatal)
    try {
      await persistAllMedia(transformedAds);
    } catch (err) {
      console.error('Failed to persist media to storage (non-fatal):', err);
    }

    return NextResponse.json({
      success: true,
      ads: transformedAds,
      count: transformedAds.length
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
