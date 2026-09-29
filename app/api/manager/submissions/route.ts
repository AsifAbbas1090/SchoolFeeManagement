import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { getManagerTotals } from "@/lib/stats";
import { formatRs } from "@/lib/format";
import { parsePositiveRupees } from "@/lib/money";

// POST /api/manager/submissions  { amount, notes? }
// Manager hands cash to Admin. Always created PENDING — only Admin can confirm it.
export async function POST(req: Request) {
  const auth = await requireApiRole("MANAGER");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const amount = parsePositiveRupees(body.amount);
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";

  const fields: Record<string, string> = {};
  if (amount === "invalid") fields.amount = "Enter a whole rupee amount greater than 0 (digits only).";
  if (notes.length > 200) fields.notes = "Notes must be 200 characters or fewer.";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Please fix the highlighted fields.", fields }, { status: 400 });

  // Can't hand over more than you're holding — catches typos like an extra zero.
  const { inHand } = await getManagerTotals(auth.session.sub);
  if ((amount as number) > inHand) {
    const msg = inHand > 0 ? `You only have ${formatRs(inHand)} in hand.` : "You have no collected cash waiting to be submitted.";
    return NextResponse.json({ error: msg, fields: { amount: msg } }, { status: 400 });
  }

  try {
    const submission = await prisma.submission.create({
      data: { amount: amount as number, notes: notes || null, submittedById: auth.session.sub, campusId: auth.session.campusId }, // status defaults to PENDING
      select: { id: true, amount: true, status: true, submissionDate: true },
    });
    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    console.error("Create submission failed:", err);
    return NextResponse.json({ error: "Could not save. Try again." }, { status: 500 });
  }
}
