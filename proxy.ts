import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { REQUEST_PATH_HEADER } from '@/lib/marketing/requestPath'

// Forwards the requested pathname to the marketing root layout, which needs it
// to build the post-login redirect (see lib/marketing/requestPath.ts). It does
// no authentication itself: the layout still verifies the session cookie.
// `set` overwrites any value the client sent, and the layout runs the path
// through safeRedirect anyway.
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set(REQUEST_PATH_HEADER, request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

// Only the marketing route group's pages. The maps, the report and the login
// page have their own layouts with a fixed redirect, and the API routes check
// the session per request (lib/auth.ts, getAuthenticatedRequest).
export const config = {
  matcher: ['/', '/sobre/:path*', '/comunicacao'],
}
