import { NextRequest, NextResponse } from 'next/server';
import { TrendAnalysisRequest } from '@/types/analysis';
import { createClient } from '@/lib/supabase/server';
import { analyzeTrends } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TrendAnalysisRequest & { forceRefresh?: boolean } = await request.json();

    const result = await analyzeTrends(
      { brandId: body.brandId, ads: body.ads, forceRefresh: body.forceRefresh },
      supabase,
      user.id
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in trend analysis route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
