import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 300;

// ============================================
// META API RESPONSE INTERFACES
// ============================================

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
  campaign_id?: string;
  adset_id?: string;
  creative?: {
    id: string;
    thumbnail_url?: string;
    image_url?: string;
    body?: string;
    title?: string;
  };
}

interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

interface MetaAdSet {
  id: string;
  name: string;
  campaign_id: string;
  status: string;
  daily_budget?: string;
  optimization_goal?: string;
  targeting?: Record<string, unknown>;
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

interface MetaAdSetInsight {
  adset_id: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  cpc: string;
  cpm: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

interface MetaBreakdownInsight {
  adset_id: string;
  impressions: string;
  clicks: string;
  spend: string;
  ctr: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
  age?: string;
  gender?: string;
  publisher_platform?: string;
}

interface MetaPagingCursors {
  before?: string;
  after?: string;
}

interface MetaPaging {
  cursors?: MetaPagingCursors;
  next?: string;
}

const META_API_VERSION = 'v21.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

const PURCHASE_ACTION_TYPES = [
  'offsite_conversion.fb_pixel_purchase',
  'purchase',
  'omni_purchase',
];

// ============================================
// HELPERS
// ============================================

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
      const code = json.error.code;
      const subcode = json.error.error_subcode;
      if (code === 190 || subcode === 463 || subcode === 467) {
        throw new Error('META_TOKEN_EXPIRED');
      }
      throw new Error(json.error.message || 'Meta API error');
    }

    if (json.data) {
      allData.push(...json.data);
    }

    url = json.paging?.next || null;
  }

  return allData;
}

function extractConversions(actions?: { action_type: string; value: string }[]): number {
  if (!actions) return 0;
  let total = 0;
  for (const action of actions) {
    if (PURCHASE_ACTION_TYPES.includes(action.action_type)) {
      total += parseInt(action.value, 10) || 0;
    }
  }
  return total;
}

function extractRevenue(actionValues?: { action_type: string; value: string }[]): number {
  if (!actionValues) return 0;
  let total = 0;
  for (const av of actionValues) {
    if (PURCHASE_ACTION_TYPES.includes(av.action_type)) {
      total += parseFloat(av.value) || 0;
    }
  }
  return total;
}

/** Meta returns budgets in cents — convert to dollars */
function centsToD(val: string | undefined): number | null {
  if (!val) return null;
  const cents = parseInt(val, 10);
  if (isNaN(cents)) return null;
  return cents / 100;
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function POST(request: NextRequest) {
  const supabase = createClient();

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

  try {
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
    const tokenExpiresAt = connection.token_expires_at;

    if (tokenExpiresAt && new Date(tokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Meta access token has expired. Please reconnect your Meta account.' },
        { status: 401 }
      );
    }

    if (!adAccountId) {
      return NextResponse.json(
        { success: false, error: 'No ad account selected. Please select an ad account on the brand dashboard.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const accountPrefix = `${META_API_BASE}/act_${adAccountId}`;

    // ============================================
    // 1. SYNC CAMPAIGNS
    // ============================================

    // Maps: meta campaign ID → internal UUID (for linking ad sets and ads)
    const campaignIdMap = new Map<string, string>();
    let totalCampaigns = 0;

    try {
      const campaignsUrl = `${accountPrefix}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget&limit=100`;
      const campaigns = await fetchAllPages<MetaCampaign>(campaignsUrl, accessToken);
      totalCampaigns = campaigns.length;

      if (campaigns.length > 0) {
        const campaignRows = campaigns.map((c) => ({
          user_id: user.id,
          client_brand_id: clientBrandId,
          meta_campaign_id: c.id,
          name: c.name,
          objective: c.objective || null,
          status: c.status,
          daily_budget: centsToD(c.daily_budget),
          lifetime_budget: centsToD(c.lifetime_budget),
          synced_at: now,
          updated_at: now,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: campError } = await (supabase as any)
          .from('client_campaigns')
          .upsert(campaignRows, { onConflict: 'client_brand_id,meta_campaign_id' });

        if (campError) {
          console.error('Error upserting campaigns:', campError);
        } else {
          // Separate select to build ID map (RLS blocks RETURNING on upsert)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: savedCampaigns } = await (supabase as any)
            .from('client_campaigns')
            .select('id, meta_campaign_id')
            .eq('client_brand_id', clientBrandId);

          if (savedCampaigns) {
            for (const row of savedCampaigns) {
              campaignIdMap.set(row.meta_campaign_id, row.id);
            }
          }
        }
      }
    } catch (err) {
      // Graceful degradation — campaign sync failure shouldn't block ad sync
      console.warn('Campaign sync failed (non-blocking):', err instanceof Error ? err.message : err);
    }

    // ============================================
    // 2. SYNC AD SETS + AD-SET-LEVEL INSIGHTS
    // ============================================

    // Maps: meta adset ID → internal UUID
    const adSetIdMap = new Map<string, string>();
    // Maps: meta adset ID → meta campaign ID (for linking)
    const adSetToCampaignMap = new Map<string, string>();
    let totalAdSets = 0;

    try {
      const adSetsUrl = `${accountPrefix}/adsets?fields=id,name,campaign_id,status,daily_budget,optimization_goal,targeting&limit=100`;
      const adSets = await fetchAllPages<MetaAdSet>(adSetsUrl, accessToken);
      totalAdSets = adSets.length;

      // Build adset → campaign lookup
      for (const adSet of adSets) {
        adSetToCampaignMap.set(adSet.id, adSet.campaign_id);
      }

      // Fetch ad-set-level insights
      const adSetInsightsUrl = `${accountPrefix}/insights?fields=adset_id,adset_name,impressions,clicks,spend,ctr,cpc,cpm,actions,action_values&level=adset&date_preset=last_30d&limit=100`;
      const adSetInsights = await fetchAllPages<MetaAdSetInsight>(adSetInsightsUrl, accessToken);

      const adSetInsightsMap = new Map<string, MetaAdSetInsight>();
      for (const insight of adSetInsights) {
        adSetInsightsMap.set(insight.adset_id, insight);
      }

      if (adSets.length > 0) {
        const adSetRows = adSets.map((as) => {
          const insight = adSetInsightsMap.get(as.id);
          const spendVal = insight ? parseFloat(insight.spend) || 0 : 0;
          const conversions = extractConversions(insight?.actions);
          const rev = extractRevenue(insight?.action_values);
          const roas = spendVal > 0 ? rev / spendVal : 0;

          // Resolve campaign FK — might not exist if campaign sync failed
          const campaignUuid = campaignIdMap.get(as.campaign_id);

          return {
            user_id: user.id,
            client_brand_id: clientBrandId,
            campaign_id: campaignUuid || null,
            meta_adset_id: as.id,
            name: as.name,
            status: as.status,
            daily_budget: centsToD(as.daily_budget),
            optimization_goal: as.optimization_goal || null,
            targeting: as.targeting || null,
            impressions: insight ? parseInt(insight.impressions, 10) || 0 : 0,
            clicks: insight ? parseInt(insight.clicks, 10) || 0 : 0,
            spend: spendVal,
            ctr: insight ? parseFloat(insight.ctr) || 0 : 0,
            cpc: insight ? parseFloat(insight.cpc) || 0 : 0,
            cpm: insight ? parseFloat(insight.cpm) || 0 : 0,
            conversions,
            revenue: rev,
            roas,
            synced_at: now,
            updated_at: now,
          };
        });

        // Ad sets with no campaign FK need it stripped for the NOT NULL constraint
        // campaign_id is NOT NULL in the schema, so skip rows where we can't resolve it
        const validAdSetRows = adSetRows.filter((row) => row.campaign_id !== null);
        const skippedAdSets = adSetRows.length - validAdSetRows.length;
        if (skippedAdSets > 0) {
          console.warn(`Skipped ${skippedAdSets} ad sets due to missing campaign FK`);
        }

        if (validAdSetRows.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: adSetError } = await (supabase as any)
            .from('client_ad_sets')
            .upsert(validAdSetRows, { onConflict: 'client_brand_id,meta_adset_id' });

          if (adSetError) {
            console.error('Error upserting ad sets:', adSetError);
          } else {
            // Separate select to build ID map (RLS blocks RETURNING on upsert)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: savedAdSets } = await (supabase as any)
              .from('client_ad_sets')
              .select('id, meta_adset_id')
              .eq('client_brand_id', clientBrandId);

            if (savedAdSets) {
              for (const row of savedAdSets) {
                adSetIdMap.set(row.meta_adset_id, row.id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Ad set sync failed (non-blocking):', err instanceof Error ? err.message : err);
    }

    // ============================================
    // 3. SYNC ADS + AD-LEVEL INSIGHTS (EXISTING)
    // ============================================

    // Now fetch ads with campaign_id and adset_id fields added
    const adsUrl = `${accountPrefix}/ads?fields=id,name,status,effective_status,campaign_id,adset_id,creative{id,thumbnail_url,body,title,image_url}&limit=100`;
    const ads = await fetchAllPages<MetaAd>(adsUrl, accessToken);

    const insightsUrl = `${accountPrefix}/insights?fields=ad_id,ad_name,impressions,clicks,spend,ctr,cpc,cpm,actions,action_values&level=ad&date_preset=last_30d&limit=100`;
    const insights = await fetchAllPages<MetaInsight>(insightsUrl, accessToken);

    const insightsMap = new Map<string, MetaInsight>();
    for (const insight of insights) {
      insightsMap.set(insight.ad_id, insight);
    }

    const rows = ads.map((ad) => {
      const insight = insightsMap.get(ad.id);
      const conversions = extractConversions(insight?.actions);
      const revenue = extractRevenue(insight?.action_values);
      const spend = insight ? parseFloat(insight.spend) || 0 : 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const cpa = conversions > 0 ? spend / conversions : 0;

      // Resolve FKs: ad → adset UUID, ad → campaign UUID
      const adsetUuid = ad.adset_id ? adSetIdMap.get(ad.adset_id) || null : null;
      // Campaign can come from the ad directly, or via the ad set
      const metaCampaignId = ad.campaign_id || (ad.adset_id ? adSetToCampaignMap.get(ad.adset_id) : undefined);
      const campaignUuid = metaCampaignId ? campaignIdMap.get(metaCampaignId) || null : null;

      return {
        user_id: user.id,
        client_brand_id: clientBrandId,
        meta_ad_id: ad.id,
        campaign_id: campaignUuid,
        adset_id: adsetUuid,
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

    // ============================================
    // 4. SYNC AUDIENCE BREAKDOWNS (age, gender, platform)
    // ============================================

    let totalBreakdowns = 0;

    try {
      const breakdownTypes: { param: string; field: 'age' | 'gender' | 'publisher_platform' }[] = [
        { param: 'age', field: 'age' },
        { param: 'gender', field: 'gender' },
        { param: 'publisher_platform', field: 'publisher_platform' },
      ];

      const allBreakdownRows: Record<string, unknown>[] = [];

      for (const { param, field } of breakdownTypes) {
        try {
          const breakdownUrl = `${accountPrefix}/insights?fields=adset_id,impressions,clicks,spend,ctr,actions,action_values&level=adset&breakdowns=${param}&date_preset=last_30d&limit=100`;
          const breakdownInsights = await fetchAllPages<MetaBreakdownInsight>(breakdownUrl, accessToken);

          for (const bi of breakdownInsights) {
            const breakdownValue = bi[field];
            if (!breakdownValue || !bi.adset_id) continue;

            const conversions = extractConversions(bi.actions);
            const rev = extractRevenue(bi.action_values);

            allBreakdownRows.push({
              user_id: user.id,
              client_brand_id: clientBrandId,
              meta_adset_id: bi.adset_id,
              breakdown_type: field,
              breakdown_value: breakdownValue,
              impressions: parseInt(bi.impressions, 10) || 0,
              clicks: parseInt(bi.clicks, 10) || 0,
              spend: parseFloat(bi.spend) || 0,
              ctr: parseFloat(bi.ctr) || 0,
              conversions,
              revenue: rev,
              synced_at: now,
              updated_at: now,
            });
          }
        } catch (err) {
          console.warn(`Breakdown sync failed for ${param} (non-blocking):`, err instanceof Error ? err.message : err);
        }
      }

      if (allBreakdownRows.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: breakdownError } = await (supabase as any)
          .from('client_ad_breakdowns')
          .upsert(allBreakdownRows, {
            onConflict: 'client_brand_id,meta_adset_id,breakdown_type,breakdown_value',
          });

        if (breakdownError) {
          console.error('Error upserting breakdowns:', breakdownError);
        } else {
          totalBreakdowns = allBreakdownRows.length;
        }
      }
    } catch (err) {
      console.warn('Breakdown sync failed (non-blocking):', err instanceof Error ? err.message : err);
    }

    // ============================================
    // RESPONSE
    // ============================================

    return NextResponse.json({
      success: true,
      totalAds: ads.length,
      adsWithInsights: insights.length,
      totalCampaigns,
      totalAdSets,
      totalBreakdowns,
      syncedAt: now,
    });
  } catch (error) {
    console.error('Error in Meta sync route:', error);

    if (error instanceof Error && error.message === 'META_TOKEN_EXPIRED') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('meta_connections')
        .update({ token_expires_at: new Date(0).toISOString() })
        .eq('user_id', user.id)
        .eq('client_brand_id', clientBrandId);

      return NextResponse.json(
        {
          success: false,
          error: 'Your Meta access token has expired. Please reconnect your Meta account from the brand dashboard.',
          tokenExpired: true,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
