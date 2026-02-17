import { NextRequest, NextResponse } from 'next/server';
import { HookAnalysisRequest } from '@/types/analysis';
import { createClient } from '@/lib/supabase/server';
import { analyzeHooks } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: HookAnalysisRequest = await request.json();

    const result = await analyzeHooks(
      { brandId: body.brandId, hooks: body.hooks },
      supabase,
      user.id
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in hook analysis route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
