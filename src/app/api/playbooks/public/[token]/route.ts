import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: { token: string };
}

// GET /api/playbooks/public/[token] - Get a public playbook (no auth required)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const { token } = params;

    // Fetch the playbook by share token
    // RLS policy allows public access for is_public=true and non-expired
    const { data: playbook, error } = await supabase
      .from('playbooks')
      .select('id, title, generated_at, my_patterns_included, competitor_trends_count, competitor_ads_count, content, created_at')
      .eq('share_token', token)
      .eq('is_public', true)
      .single();

    if (error || !playbook) {
      return NextResponse.json(
        { success: false, error: 'Playbook not found or link has expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playbook,
    });
  } catch (error) {
    console.error('Error fetching public playbook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
