import { NextResponse } from 'next/server';
import { verifyJwtHS256, SESSION_COOKIE_NAME } from './lib/jwt-edge';

const PUBLIC_FILE = /\.(.*)$/;
const PUBLIC_PAGES = ['/login', '/register', '/forgot-password'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, _next internal files, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Allow unauthenticated auth APIs and webhooks
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/webhooks')
  ) {
    return NextResponse.next();
  }

  // 3. Extract and verify session token
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let payload = null;
  if (token) {
    try {
      payload = await verifyJwtHS256(token);
    } catch {
      payload = null;
    }
  }

  const isAuthenticated = Boolean(payload && payload.id && payload.role === 'admin');
  const isPublicPage = PUBLIC_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // 4. If already authenticated admin visits /login or /register, redirect to dashboard /
  if (isAuthenticated && isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // 5. If unauthenticated user tries to call protected API routes (except /api/auth/me which handles its own response)
  if (!isAuthenticated && pathname.startsWith('/api/')) {
    if (pathname === '/api/auth/me') {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: 'Administrator authentication required' },
      { status: 401 }
    );
  }

  // 6. If unauthenticated user tries to access protected pages, redirect to /login
  if (!isAuthenticated && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname && pathname !== '/') {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except _next/static, _next/image, favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
