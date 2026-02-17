import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzePatterns } from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { brandId, forceRefresh } = body;

    const result = await analyzePatterns(
      { brandId, forceRefresh },
      supabase,
      user.id
    );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in pattern analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
