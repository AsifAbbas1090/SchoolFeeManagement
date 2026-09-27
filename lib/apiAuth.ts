import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { SessionPayload } from "@/lib/session";

// For route handlers: returns the session, or a ready-made 401/403 response.
// Second layer behind middleware.ts — handlers never trust the URL alone.
export async function requireApiRole(
  role: SessionPayload["role"]
): Promise<{ session: SessionPayload; error?: never } | { session?: never; error: NextResponse }> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  if (session.role !== role) return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { session };
}
