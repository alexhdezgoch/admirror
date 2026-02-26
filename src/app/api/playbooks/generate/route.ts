import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generatePlaybook } from '@/lib/analysis';

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
    const { brandId, title, forceRefresh, trends, patterns } = body;

    const result = await generatePlaybook(
      { brandId, title, forceRefresh, trends, patterns },
      supabase,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating playbook:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
