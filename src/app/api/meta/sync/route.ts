import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  creative?: {
    id: string;
    thumbnail_url?: string;
    image_url?: string;
    body?: string;
    title?: string;
  };
}

interface MetaInsight {
  ad_id: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

interface MetaPagingCursors {
  before?: string;
  after?: string;
}

interface MetaPaging {
  cursors?: MetaPagingCursors;
  next?: string;
}

interface MetaAdsResponse {
  data: MetaAd[];
  paging?: MetaPaging;
}

interface MetaInsightsResponse {
  data: MetaInsight[];
  paging?: MetaPaging;
}

const PURCHASE_ACTION_TYPES = [
  'offsite_conversion.fb_pixel_purchase',
  'purchase',
  'omni_purchase',
];

async function fetchAllPages<T>(
  initialUrl: string,
  accessToken: string
): Promise<T[]> {
  const allData: T[] = [];
  let url: string | null = initialUrl;

  while (url) {
    const separator: string = url.includes('?') ? '&' : '?';
    const fetchUrl: string = url.includes('access_token')
      ? url
      : `${url}${separator}access_token=${accessToken}`;

    const response = await fetch(fetchUrl);
    const json = await response.json();

    if (json.error) {
      throw new Error(json.error.message || 'Meta API error');
    }

    if (json.data) {
      allData.push(...json.data);
    }

    url = json.paging?.next || null;
  }

  return allData;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { clientBrandId } = body;

    if (!clientBrandId) {
      return NextResponse.json(
        { success: false, error: 'clientBrandId is required' },
        { status: 400 }
      );
    }

    // Fetch meta connection for this user + brand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: connError } = await (supabase as any)
      .from('meta_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('client_brand_id', clientBrandId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { success: false, error: 'Meta account not connected. Please connect via the brand dashboard.' },
        { status: 400 }
      );
    }

    const accessToken = connection.access_token;
    const adAccountId = connection.ad_account_id;

    if (!adAccountId) {
      return NextResponse.json(
        { success: false, error: 'No ad account selected. Please select an ad account on the brand dashboard.' },
        { status: 400 }
      );
    }

    // Fetch ads from Meta Marketing API (with pagination)
    const adsUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/ads?fields=id,name,status,effective_status,creative{id,thumbnail_url,body,title,image_url}&limit=100`;
    const ads = await fetchAllPages<MetaAd>(adsUrl, accessToken);

    // Fetch insights from Meta Marketing API (with pagination)
    const insightsUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/insights?fields=ad_id,ad_name,impressions,clicks,spend,ctr,cpc,cpm,actions,action_values&level=ad&date_preset=last_30d&limit=100`;
    const insights = await fetchAllPages<MetaInsight>(insightsUrl, accessToken);

    // Build insights lookup map: ad_id -> metrics
    const insightsMap = new Map<string, MetaInsight>();
    for (const insight of insights) {
      insightsMap.set(insight.ad_id, insight);
    }

    // Build upsert rows
    const now = new Date().toISOString();
    const rows = ads.map((ad) => {
      const insight = insightsMap.get(ad.id);

      let conversions = 0;
      let revenue = 0;

      if (insight?.actions) {
        for (const action of insight.actions) {
          if (PURCHASE_ACTION_TYPES.includes(action.action_type)) {
            conversions += parseInt(action.value, 10) || 0;
          }
        }
      }

      if (insight?.action_values) {
        for (const av of insight.action_values) {
          if (PURCHASE_ACTION_TYPES.includes(av.action_type)) {
            revenue += parseFloat(av.value) || 0;
          }
        }
      }

      const spend = insight ? parseFloat(insight.spend) || 0 : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      return {
        user_id: user.id,
        client_brand_id: clientBrandId,
        meta_ad_id: ad.id,
        name: ad.name,
        status: ad.status,
        effective_status: ad.effective_status,
        thumbnail_url: ad.creative?.thumbnail_url || null,
        image_url: ad.creative?.image_url || null,
        body: ad.creative?.body || null,
        title: ad.creative?.title || null,
        impressions: insight ? parseInt(insight.impressions, 10) || 0 : 0,
        clicks: insight ? parseInt(insight.clicks, 10) || 0 : 0,
        spend,
        ctr: insight ? parseFloat(insight.ctr) || 0 : 0,
        cpc: insight ? parseFloat(insight.cpc) || 0 : 0,
        cpm: insight ? parseFloat(insight.cpm) || 0 : 0,
        conversions,
        revenue,
        roas,
        cpa,
        synced_at: now,
        updated_at: now,
      };
    });

    // Upsert into client_ads (on conflict: client_brand_id, meta_ad_id)
    if (rows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: upsertError } = await (supabase as any)
        .from('client_ads')
        .upsert(rows, { onConflict: 'client_brand_id,meta_ad_id' });

      if (upsertError) {
        console.error('Error upserting client ads:', upsertError);
        return NextResponse.json(
          { success: false, error: `Failed to save ads: ${upsertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      totalAds: ads.length,
      adsWithInsights: insights.length,
      syncedAt: now,
    });
  } catch (error) {
    console.error('Error in Meta sync route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
