import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";

// POST /api/admin/submissions/:id/confirm — Admin has physically counted and received the cash.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  // Only flips PENDING -> CONFIRMED, atomically, so a double-click can't confirm twice.
  const { count } = await prisma.submission.updateMany({
    where: { id: params.id, status: "PENDING" },
    data: { status: "CONFIRMED", confirmedAt: new Date(), confirmedById: auth.session.sub },
  });

  if (count === 0) {
    const exists = await prisma.submission.findUnique({ where: { id: params.id }, select: { status: true } });
    return exists
      ? NextResponse.json({ error: "This submission is already confirmed." }, { status: 409 })
      : NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
