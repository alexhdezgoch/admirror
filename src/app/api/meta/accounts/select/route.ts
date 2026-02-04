import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { accountId, accountName, brandId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'accountId is required' },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId is required' },
        { status: 400 }
      );
    }

    // Update the meta connection with the selected account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('meta_connections')
      .update({
        ad_account_id: accountId,
        ad_account_name: accountName || null,
      })
      .eq('user_id', user.id)
      .eq('client_brand_id', brandId);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      adAccountId: accountId,
      adAccountName: accountName,
    });
  } catch (error) {
    console.error('Error selecting Meta ad account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
