import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST: Normalize competitor names OR clear stale trend data
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const brandId = '16f30bb7-8aaa-4353-8d7b-6cfdee43af06'; // Milton's brand ID

  // Check action parameter
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'clear-trends') {
    // Delete stale trend_analyses data
    const { error } = await supabase
      .from('trend_analyses')
      .delete()
      .eq('brand_id', brandId);

    return NextResponse.json({
      success: !error,
      action: 'clear-trends',
      brandId,
      error: error?.message,
    });
  }

  // Default: Normalize competitor names
  const updates = [
    { from: 'Turbolearn ai', to: 'Turbo Ai' },
    { from: 'Milton App', to: 'Milton (Your Ads)' },
  ];

  const results = [];

  for (const { from, to } of updates) {
    const { data, error } = await supabase
      .from('ads')
      .update({ competitor_name: to })
      .eq('client_brand_id', brandId)
      .eq('competitor_name', from)
      .select('id');

    results.push({
      from,
      to,
      updated: data?.length || 0,
      error: error?.message,
    });
  }

  return NextResponse.json({
    success: true,
    brandId,
    updates: results,
  });
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin();
  const brandName = request.nextUrl.searchParams.get('brand') || 'Milton';

  // 1. Find brand by name (using admin client to bypass RLS)
  const { data: brands } = await supabase
    .from('client_brands')
    .select('*')
    .ilike('name', `%${brandName}%`);

  if (!brands?.length) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  const brand = brands[0];

  // 2. Get competitors from competitors table
  const { data: competitors } = await supabase
    .from('competitors')
    .select('id, name, brand_id, total_ads')
    .eq('brand_id', brand.id);

  // 3. Get ads and their competitor_name values
  const { data: ads } = await supabase
    .from('ads')
    .select('id, competitor_name, client_brand_id, is_client_ad')
    .eq('client_brand_id', brand.id)
    .limit(100);

  // 4. Get unique competitor names from ads
  const competitorNamesInAds = Array.from(new Set((ads || []).map(a => a.competitor_name)));

  // 5. Find mismatches - competitor names in ads NOT in competitors table
  const validCompetitorNames = new Set((competitors || []).map(c => c.name?.toLowerCase()));
  const mismatches = competitorNamesInAds.filter(name =>
    name && !validCompetitorNames.has(name.toLowerCase())
  );

  // 6. Check trend_analyses for stale competitor data
  const { data: trendData } = await supabase
    .from('trend_analyses')
    .select('trends')
    .eq('brand_id', brand.id)
    .single();

  // Extract competitor names mentioned in trends
  const trendsJson = JSON.stringify(trendData?.trends || []);
  const trendCompetitorMentions = trendsJson.match(/"competitorName"\s*:\s*"([^"]+)"/g)
    ?.map(m => m.match(/"([^"]+)"$/)?.[1])
    .filter(Boolean) || [];

  return NextResponse.json({
    brand: {
      id: brand.id,
      name: brand.name,
    },
    competitors: {
      count: competitors?.length || 0,
      names: competitors?.map(c => c.name) || [],
    },
    ads: {
      count: ads?.length || 0,
      uniqueCompetitorNames: competitorNamesInAds,
    },
    issues: {
      mismatchedCompetitors: mismatches,
      mismatchCount: mismatches.length,
    },
    trends: {
      hasData: !!trendData?.trends,
      competitorsMentioned: Array.from(new Set(trendCompetitorMentions)),
      rawTrends: trendData?.trends,
    },
  });
}
