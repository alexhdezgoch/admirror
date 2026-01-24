import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { Database } from '@/types/supabase';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      response: NextResponse.next({ request }),
      user: null
    };
  }

  // Debug: Log all cookies from the request
  const allCookies = request.cookies.getAll();
  const sbCookies = allCookies.filter(c => c.name.startsWith('sb-'));
  console.log(`[Middleware] Path: ${request.nextUrl.pathname}`);
  console.log(`[Middleware] Total cookies: ${allCookies.length}, Supabase cookies: ${sbCookies.length}`);
  console.log(`[Middleware] Supabase cookie names: ${sbCookies.map(c => c.name).join(', ') || 'NONE'}`);

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          console.log(`[Middleware] setAll called with ${cookiesToSet.length} cookies`);

          // Update cookies on the request for downstream middleware/handlers
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          // Create a new response that will carry the updated cookies
          supabaseResponse = NextResponse.next({
            request,
          });

          // Set the cookies on the response to send back to the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Do NOT use getSession() here - it reads from storage and may have stale data
  // getUser() validates the token with the Supabase server and will refresh if needed
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log(`[Middleware] getUser result: ${user ? user.email : 'NO USER'}, error: ${error?.message || 'none'}`);

  return { response: supabaseResponse, user };
}
