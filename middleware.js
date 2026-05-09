import { NextResponse } from 'next/server';

export function middleware(request) {
  // Use cookies.get('session_token') to check for authentication
  const token = request.cookies.get('session_token');
  const { pathname } = request.nextUrl;

  // 1. Protect Dashboard Routes
  // If trying to access any path starting with /dashboard without a token, redirect to /login
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      console.log(`Unauthorized access attempt to ${pathname}. Redirecting to /login`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // 2. Prevent Access to Login/Root if already authenticated
  // If the user is already logged in, they shouldn't see the login page again
  if (pathname === '/login' || pathname === '/') {
    if (token) {
      console.log(`Authenticated user accessing ${pathname}. Redirecting to /dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const response = NextResponse.next();

  // 4. Disable Caching for Dashboard to prevent "Back Button" access to stale data
  if (pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  }

  return response;
}

// 3. Matcher configuration
// This tells Next.js which paths this middleware should run on.
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*', // Matches all sub-routes of dashboard
  ],
};
