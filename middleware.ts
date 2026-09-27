import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homePathFor, verifySession } from "@/lib/session";

// Role gate for every protected route. Runs before any page or API handler.
//   /admin/*, /api/admin/*                    -> ADMIN only
//   /manager/*, /api/manager/*, /api/payments -> MANAGER only
//   /login                                    -> signed-in users are sent to their own dashboard
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (pathname === "/login") {
    return session ? redirectTo(req, homePathFor(session.role)) : NextResponse.next();
  }

  const needs = /^\/(api\/)?admin(\/|$)/.test(pathname) ? "ADMIN" : "MANAGER";

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    const res = redirectTo(req, "/login");
    // Drop a stale/tampered cookie if one was sent.
    if (req.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (session.role !== needs) {
    if (isApi) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    return redirectTo(req, homePathFor(session.role));
  }

  return NextResponse.next();
}

// Redirect to a path on the address the BROWSER used. Behind nginx, req.url is the app's internal
// address (localhost:3000), so the public host/scheme come from the proxy's forwarded headers.
// (Next 14 middleware rejects relative Location headers, so the URL must be absolute.)
function redirectTo(req: NextRequest, path: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = (req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")).split(",")[0].trim();
  return NextResponse.redirect(new URL(path, `${proto}://${host}`), 307);
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/manager/:path*", "/api/admin/:path*", "/api/manager/:path*", "/api/payments/:path*"],
};
