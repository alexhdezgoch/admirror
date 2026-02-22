import { NextRequest, NextResponse } from 'next/server';
import { runVelocityPipeline } from '@/lib/analysis/creative-velocity';

export const maxDuration = 120;

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
    const stats = await runVelocityPipeline();
    console.log('[VELOCITY-CRON] Analysis complete:', stats);
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('[VELOCITY-CRON] Fatal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
