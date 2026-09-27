import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseExpenseInput } from "@/lib/expenseInput";
import { getManagerTotals } from "@/lib/stats";
import { formatRs } from "@/lib/format";

// POST /api/manager/expenses  { title, category, amount, expenseDate, notes? }
// A manager records school money they spent out of collected cash. Always PENDING until Admin
// reviews it; it reduces their cash in hand immediately (the cash is already gone).
export async function POST(req: Request) {
  const auth = await requireApiRole("MANAGER");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const parsed = parseExpenseInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });

  // Can't spend collected cash you're not holding.
  const { inHand } = await getManagerTotals(auth.session.sub);
  if (parsed.data.amount > inHand) {
    const msg = inHand > 0 ? `You only have ${formatRs(inHand)} in hand.` : "You have no collected cash in hand to spend.";
    return NextResponse.json({ error: msg, fields: { amount: msg } }, { status: 400 });
  }

  try {
    const expense = await prisma.expense.create({
      data: { ...parsed.data, addedById: auth.session.sub, status: "PENDING" },
      select: { id: true, amount: true, status: true },
    });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error("Create manager expense failed:", err);
    return NextResponse.json({ error: "Could not save the expense. Try again." }, { status: 500 });
  }
}
