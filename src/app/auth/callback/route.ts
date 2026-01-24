import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

// Extract project ref from Supabase URL for cookie naming
function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // URL format: https://{project-ref}.supabase.co
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : 'supabase';
}

// Base64 encode for cookie value
function base64Encode(str: string): string {
  return Buffer.from(str).toString('base64');
}

// Chunk a string into parts of max size
function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log('[Auth Callback] Starting with code:', code ? 'present' : 'MISSING');

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // Create Supabase client - setAll is ignored, we'll set cookies manually
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Intentionally empty - we set cookies manually below
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  console.log('[Auth Callback] Exchange result:', {
    hasSession: !!data.session,
    userEmail: data.session?.user?.email,
    error: error?.message,
  });

  if (error || !data.session) {
    console.error('[Auth Callback] Error:', error?.message || 'No session returned');
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
  }

  // Create response
  const response = NextResponse.redirect(`${origin}${next}`);

  // Manually construct and set auth cookies from the session
  const projectRef = getProjectRef();
  const cookieBaseName = `sb-${projectRef}-auth-token`;

  // Build the session data structure that Supabase expects
  const sessionData = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: data.session.user,
  };

  const sessionJson = JSON.stringify(sessionData);
  const encodedSession = `base64-${base64Encode(sessionJson)}`;

  console.log('[Auth Callback] Session JSON length:', sessionJson.length);
  console.log('[Auth Callback] Encoded session length:', encodedSession.length);

  // Cookie options
  const cookieOptions = {
    path: '/',
    sameSite: 'lax' as const,
    httpOnly: false, // Browser client needs to read this
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  };

  // Check if we need to chunk (browser cookie limit is ~4096 bytes, use 3500 to be safe)
  const CHUNK_SIZE = 3500;

  if (encodedSession.length <= CHUNK_SIZE) {
    // Single cookie
    console.log('[Auth Callback] Setting single auth cookie:', cookieBaseName);
    response.cookies.set(cookieBaseName, encodedSession, cookieOptions);
  } else {
    // Chunked cookies
    const chunks = chunkString(encodedSession, CHUNK_SIZE);
    console.log(`[Auth Callback] Setting ${chunks.length} chunked auth cookies`);

    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${cookieBaseName}.${i}`;
      console.log(`[Auth Callback] Setting chunk: ${chunkName} (${chunks[i].length} bytes)`);
      response.cookies.set(chunkName, chunks[i], cookieOptions);
    }
  }

  // Clear the PKCE code verifier cookie
  const codeVerifierCookie = `sb-${projectRef}-auth-token-code-verifier`;
  console.log('[Auth Callback] Clearing code verifier cookie:', codeVerifierCookie);
  response.cookies.set(codeVerifierCookie, '', {
    path: '/',
    maxAge: 0,
  });

  // Log final cookies on response
  const finalCookies = response.cookies.getAll();
  console.log(`[Auth Callback] Response has ${finalCookies.length} cookies:`, finalCookies.map(c => c.name));

  return response;
}
