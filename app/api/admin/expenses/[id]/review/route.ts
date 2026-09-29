import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";

// POST /api/admin/expenses/:id/review  { decision: "APPROVE" | "REJECT", note? }
// Approved: counts as a school expense (and stays deducted from the manager's cash).
// Rejected: not a school expense; the amount goes back into the manager's cash in hand (they owe it).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const decision = body?.decision;
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: 'decision must be "APPROVE" or "REJECT".' }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 200) : "";

  // Atomic: only a still-PENDING expense can be reviewed, so a double-click can't review twice.
  const { count } = await prisma.expense.updateMany({
    where: { id: params.id, campusId: auth.session.campusId, status: "PENDING" },
    data: {
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date(),
      reviewedById: auth.session.sub,
      reviewNote: note || null,
    },
  });
  if (count === 0) {
    const exists = await prisma.expense.findFirst({ where: { id: params.id, campusId: auth.session.campusId }, select: { status: true } });
    return exists
      ? NextResponse.json({ error: "This expense has already been reviewed." }, { status: 409 })
      : NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
