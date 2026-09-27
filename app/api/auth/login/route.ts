import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, homePathFor } from "@/lib/session";

// POST /api/auth/login  { username, password }
export async function POST(req: Request) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!username.trim() || !password) {
    return NextResponse.json({ error: "Enter both username and password." }, { status: 400 });
  }

  try {
    const result = await signIn(username, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const res = NextResponse.json({
      role: result.user.role,
      name: result.user.name,
      redirectTo: homePathFor(result.user.role),
    });
    res.cookies.set(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("Login failed:", err);
    return NextResponse.json(
      { error: "Login is unavailable right now (server or database error). Try again shortly." },
      { status: 500 }
    );
  }
}
