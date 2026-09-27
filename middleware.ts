import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homePathFor, verifySession } from "@/lib/session";

// Role gate for every protected route. Runs before any page or API handler.
//   /admin/*, /api/admin/*     -> ADMIN only
//   /manager/*, /api/manager/*, /api/payments -> MANAGER only
//   /login                     -> signed-in users are sent to their own dashboard
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") {
    return session ? NextResponse.redirect(new URL(homePathFor(session.role), req.url)) : NextResponse.next();
  }

  const needs = /^\/(api\/)?admin(\/|$)/.test(pathname) ? "ADMIN" : "MANAGER";

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const url = new URL("/login", req.url);
    return clearingRedirect(url, req);
  }

  if (session.role !== needs) {
    if (isApi) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    return NextResponse.redirect(new URL(homePathFor(session.role), req.url));
  }

  return NextResponse.next();
}

// Redirect to login, dropping a stale/tampered cookie if one was sent.
function clearingRedirect(url: URL, req: NextRequest) {
  const res = NextResponse.redirect(url);
  if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
  return res;
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/manager/:path*", "/api/admin/:path*", "/api/manager/:path*", "/api/payments/:path*"],
};
