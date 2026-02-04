import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }

  const brandId = request.nextUrl.searchParams.get('brandId');

  if (!brandId) {
    return NextResponse.json(
      { error: 'brandId query parameter is required' },
      { status: 400 }
    );
  }

  const appId = process.env.META_APP_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/meta/callback`;

  if (!appId) {
    return NextResponse.json(
      { error: 'META_APP_ID is not configured' },
      { status: 500 }
    );
  }

  const scopes = 'ads_read,business_management';
  const state = `${user.id}:${brandId}`;

  const authUrl =
    `https://www.facebook.com/v21.0/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${state}` +
    `&response_type=code`;

  return NextResponse.redirect(authUrl);
}
