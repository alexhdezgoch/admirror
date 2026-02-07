import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PlaybookListResponse, PlaybookRow } from '@/types/playbook';

// GET /api/playbooks - List all playbooks for a brand
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    // Fetch playbooks for the brand
    const { data: playbooks, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('brand_id', brandId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch playbooks:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch playbooks' },
        { status: 500 }
      );
    }

    const response: PlaybookListResponse = {
      success: true,
      playbooks: (playbooks || []) as unknown as PlaybookRow[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching playbooks:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
