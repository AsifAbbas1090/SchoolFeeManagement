import { SignJWT, jwtVerify } from "jose";

// Edge-safe JWT helpers (no Prisma / bcrypt imports) so middleware can use them too.

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 12; // 12 hours, in seconds

export type SessionRole = "ADMIN" | "MANAGER";

export type SessionPayload = {
  sub: string; // user id
  role: SessionRole;
  name: string;
  campusId: string; // every query is scoped to this campus (lib/scope.ts)
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set in .env");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, name: payload.name, campusId: payload.campusId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

// Returns the decoded payload, or null if the token is missing, tampered with, or expired.
export async function verifySession(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") return null;
    if (typeof payload.campusId !== "string" || !payload.campusId) return null; // pre-campus tokens → sign in again
    return { sub: payload.sub, role: payload.role, name: String(payload.name ?? ""), campusId: payload.campusId };
  } catch {
    return null;
  }
}

export function homePathFor(role: SessionRole) {
  return role === "ADMIN" ? "/admin" : "/manager";
}
