import { NextResponse } from "next/server";
import { getActor, type Actor } from "@/lib/auth";
import type { SessionRole } from "@/lib/session";

// For route handlers: returns the signed-in, still-active user, or a ready-made 401/403 response.
// Second layer behind middleware.ts — handlers never trust the URL alone.
export async function requireApiRole(
  role: SessionRole
): Promise<{ session: Actor; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getActor();
  if (!session) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (session.role !== role) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { session };
}
