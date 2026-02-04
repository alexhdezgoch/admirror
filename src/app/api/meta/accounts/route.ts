import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
}

export async function GET(request: NextRequest) {
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

    const brandId = request.nextUrl.searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { success: false, error: 'brandId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch meta connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: connError } = await (supabase as any)
      .from('meta_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('client_brand_id', brandId)
      .single();

    if (connError || !connection) {
      return NextResponse.json(
        { success: false, error: 'Meta account not connected' },
        { status: 400 }
      );
    }

    // Fetch ad accounts from Meta
    const response = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,account_id,name&access_token=${connection.access_token}`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await response.json();

    if (json.error) {
      return NextResponse.json(
        { success: false, error: json.error.message || 'Failed to fetch ad accounts' },
        { status: 500 }
      );
    }

    const accounts = (json.data || []).map((acc: MetaAdAccount) => ({
      id: acc.account_id,
      name: acc.name,
    }));

    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error('Error fetching Meta ad accounts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
