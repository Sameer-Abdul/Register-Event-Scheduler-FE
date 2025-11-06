import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Update routes to include the /event-scheduler prefix
const protectedRoutes = ['/event-scheduler/dashboard', '/dashboard'];
// Payment success page is public to allow users to see the success page after payment
const publicPaymentRoutes = ['/payment/success'];
const publicRoutes = ['/event-scheduler/login', '/login', '/register'];
const protectedApiRoutes = ['/api/tenants'];
const publicApiRoutes = ['/api/test', '/api/db-test', '/api/test-tenants', '/api/tenants-v2', '/api/auth'];

// Helper to normalize paths for comparison
const normalizePath = (path: string) => {
  return path.endsWith('/') ? path.slice(0, -1) : path;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request });

  // Handle API routes
  if (pathname.startsWith('/api')) {
    // Skip middleware for public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }
    
    // Check if the API route is protected
    const isProtectedApiRoute = protectedApiRoutes.some(route => pathname.startsWith(route));
    
    if (isProtectedApiRoute && !token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Add CORS headers for all API routes
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // Normalize the path for comparison
  const normalizedPath = normalizePath(pathname);

  // Skip middleware for public payment routes
  if (publicPaymentRoutes.some(route => normalizedPath.startsWith(route))) {
    return NextResponse.next();
  }

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some(route => 
    normalizedPath === route || normalizedPath.startsWith(`${route}/`)
  );

  // If user is authenticated and trying to access a public route, redirect to dashboard
  if (token && isPublicRoute) {
    const dashboardUrl = new URL('/event-scheduler/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    normalizedPath === route || normalizedPath.startsWith(`${route}/`)
  );

  // If user is not authenticated and trying to access a protected route, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/event-scheduler/login', request.url);
    loginUrl.searchParams.set('callbackUrl', normalizedPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
