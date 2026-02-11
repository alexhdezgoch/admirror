import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

console.log('=== MIDDLEWARE MODULE LOADED ===');

// Routes that don't require authentication
const publicRoutes = ['/login', '/signup', '/auth/callback'];

export async function middleware(request: NextRequest) {
  console.log(`[MW] Request to: ${request.nextUrl.pathname}`);
  console.log(`[MW] SUPABASE_URL set: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);

  // Skip auth if Supabase is not configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('[MW] Supabase not configured, skipping auth');
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // If not authenticated and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);

    // Preserve any cookies that were set during the session check
    // This ensures token refresh cookies are not lost
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  // If authenticated and trying to access login/signup/landing, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/')) {
    const redirectResponse = NextResponse.redirect(new URL('/dashboard', request.url));

    // Preserve cookies on redirect
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });

    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes - they handle their own auth)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
