import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { connected: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const brandId = request.nextUrl.searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json(
        { connected: false, error: 'brandId query parameter is required' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: connection, error: connError } = await (supabase as any)
      .from('meta_connections')
      .select('ad_account_id, ad_account_name, token_expires_at')
      .eq('user_id', user.id)
      .eq('client_brand_id', brandId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({
          connected: false,
          expired: true,
          error: 'Token expired. Please reconnect your Meta account.',
        });
      }
    }

    return NextResponse.json({
      connected: true,
      adAccountId: connection.ad_account_id || null,
      adAccountName: connection.ad_account_name || null,
    });
  } catch (error) {
    console.error('Error checking Meta status:', error);
    return NextResponse.json(
      { connected: false, error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
