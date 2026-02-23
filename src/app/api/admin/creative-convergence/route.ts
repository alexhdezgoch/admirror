import { NextRequest, NextResponse } from 'next/server';
import { analyzeCreativeConvergence } from '@/lib/analysis/creative-convergence';

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

  const brandId = request.nextUrl.searchParams.get('brandId');
  if (!brandId) {
    return NextResponse.json(
      { error: 'brandId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeCreativeConvergence(brandId);
    if (!analysis) {
      return NextResponse.json(
        { error: 'No data found for this brand or competitive set' },
        { status: 404 }
      );
    }
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[CONVERGENCE-API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
