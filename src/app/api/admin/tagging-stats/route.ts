import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
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

  try {
    const supabase = getSupabaseAdmin();

    // Count ads by tagging_status
    const { data: allAds } = await supabase
      .from('ads')
      .select('tagging_status');

    const statusCounts = { tagged: 0, pending: 0, failed: 0, skipped: 0 };
    const totalAds = allAds?.length || 0;
    for (const ad of allAds || []) {
      const status = ad.tagging_status as keyof typeof statusCounts;
      if (status in statusCounts) {
        statusCounts[status]++;
      } else {
        statusCounts.pending++;
      }
    }

    // Total cost
    const { data: costData } = await supabase
      .from('tagging_cost_log')
      .select('estimated_cost_usd, created_at');

    let totalCostUsd = 0;
    let costLast7Days = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    for (const entry of costData || []) {
      const cost = Number(entry.estimated_cost_usd) || 0;
      totalCostUsd += cost;
      if (entry.created_at >= sevenDaysAgo) {
        costLast7Days += cost;
      }
    }

    const taggedCount = statusCounts.tagged || 1;
    const avgCostPerAd = totalCostUsd / taggedCount;

    // Last run time
    const { data: lastRun } = await supabase
      .from('ads')
      .select('tagging_attempted_at')
      .not('tagging_attempted_at', 'is', null)
      .order('tagging_attempted_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      totalAds,
      tagged: statusCounts.tagged,
      pending: statusCounts.pending,
      failed: statusCounts.failed,
      skipped: statusCounts.skipped,
      totalCostUsd: Math.round(totalCostUsd * 100) / 100,
      costLast7Days: Math.round(costLast7Days * 100) / 100,
      avgCostPerAd: Math.round(avgCostPerAd * 1000000) / 1000000,
      lastRunAt: lastRun?.tagging_attempted_at || null,
    });
  } catch (error) {
    console.error('[TAGGING-STATS] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
