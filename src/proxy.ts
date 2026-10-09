import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate: bounce visitors without a session cookie away from account pages.
 * The authoritative check (valid, unrevoked session in the DB) happens in each page via requireUser().
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("oottam_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account", "/account/:path*", "/admin", "/admin/:path*"],
};
