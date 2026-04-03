import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login, auth API, and video downloads (Zernio fetches these without a cookie)
  if (
    pathname === '/login' ||
    pathname === '/api/auth' ||
    pathname.startsWith('/api/download/') ||
    pathname === '/api/auto-pipeline'
  ) {
    return NextResponse.next();
  }

  const auth = req.cookies.get('auth')?.value;
  if (auth !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
