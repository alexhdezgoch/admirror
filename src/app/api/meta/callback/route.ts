import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Parse state as userId:brandId
  const [stateUserId, brandId] = (state || '').split(':');

  // Fallback redirect target
  const brandUrl = brandId ? `/brands/${brandId}` : '/settings';

  if (errorParam) {
    const errorDesc = searchParams.get('error_description') || 'Authorization denied';
    return NextResponse.redirect(
      `${appUrl}${brandUrl}?meta_error=${encodeURIComponent(errorDesc)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${appUrl}${brandUrl}?meta_error=${encodeURIComponent('No authorization code received')}`
    );
  }

  if (!brandId) {
    return NextResponse.redirect(
      `${appUrl}/settings?meta_error=${encodeURIComponent('Missing brand ID in state')}`
    );
  }

  const supabase = createClient();

  // Verify user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // Verify state userId matches user.id (CSRF protection)
  if (stateUserId !== user.id) {
    return NextResponse.redirect(
      `${appUrl}${brandUrl}?meta_error=${encodeURIComponent('Invalid state parameter')}`
    );
  }

  try {
    // Exchange code for access token
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${appUrl}/api/meta/callback`;

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        `${appUrl}${brandUrl}?meta_error=${encodeURIComponent('Meta app credentials not configured')}`
      );
    }

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
        `?client_id=${appId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&client_secret=${appSecret}` +
        `&code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${appUrl}${brandUrl}?meta_error=${encodeURIComponent(tokenData.error.message || 'Failed to get access token')}`
      );
    }

    let accessToken = tokenData.access_token;
    let expiresAt: string | null = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    // Exchange short-lived token for a long-lived token (~60 days)
    try {
      const longLivedResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token` +
          `?grant_type=fb_exchange_token` +
          `&client_id=${appId}` +
          `&client_secret=${appSecret}` +
          `&fb_exchange_token=${accessToken}`
      );
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.access_token) {
        accessToken = longLivedData.access_token;
        expiresAt = longLivedData.expires_in
          ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString()
          : null;
      }
    } catch (e) {
      // If long-lived exchange fails, continue with the short-lived token
      console.warn('Failed to exchange for long-lived token, using short-lived:', e);
    }

    // Upsert meta connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from('meta_connections')
      .upsert(
        {
          user_id: user.id,
          client_brand_id: brandId,
          access_token: accessToken,
          token_expires_at: expiresAt,
        },
        { onConflict: 'user_id,client_brand_id' }
      );

    if (upsertError) {
      console.error('Error saving meta connection:', upsertError);
      return NextResponse.redirect(
        `${appUrl}${brandUrl}?meta_error=${encodeURIComponent('Failed to save connection')}`
      );
    }

    return NextResponse.redirect(`${appUrl}/brands/${brandId}?meta_connected=true`);
  } catch (error) {
    console.error('Error in Meta OAuth callback:', error);
    return NextResponse.redirect(
      `${appUrl}${brandUrl}?meta_error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
