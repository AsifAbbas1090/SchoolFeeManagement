import bcrypt from "bcryptjs";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, homePathFor, signSession, verifySession, type SessionPayload } from "@/lib/session";

export { verifySession } from "@/lib/session";

// Compared against when the username doesn't exist, so a wrong username and a wrong
// password take the same time (no hint about which usernames are real).
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export type SignInResult =
  | { ok: true; token: string; user: SessionPayload }
  | { ok: false; error: string };

export async function signIn(username: string, password: string): Promise<SignInResult> {
  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) {
    return { ok: false, error: "Incorrect username or password." };
  }
  if (!user.isActive) {
    return { ok: false, error: "This account has been deactivated. Contact the Admin." };
  }

  const payload: SessionPayload = { sub: user.id, role: user.role, name: user.name, campusId: user.campusId };
  return { ok: true, token: await signSession(payload), user: payload };
}

// For server components / route handlers: reads the session cookie and verifies it.
export async function getSession(): Promise<SessionPayload | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

// The signed-in user as the database sees them NOW (not just what the cookie says).
// A valid cookie is not enough: a deactivated user, or one moved to another campus, is rejected
// immediately instead of when their 12-hour cookie expires. Cached per request.
export type Actor = SessionPayload & { campusName: string };

export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true, role: true, name: true, campusId: true, campus: { select: { name: true } } },
  });
  if (!user || !user.isActive || user.role !== session.role || user.campusId !== session.campusId) return null;
  return { ...session, name: user.name, campusName: user.campus.name };
});

// Server-side guard for layouts/pages (second layer behind middleware.ts).
// Redirects to /login when signed out/deactivated, or to the user's own area on a role mismatch.
export async function requireRole(role: SessionPayload["role"]): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.role !== role) redirect(homePathFor(actor.role));
  return actor;
}
