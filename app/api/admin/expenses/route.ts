import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseExpenseInput } from "@/lib/expenseInput";

// POST /api/admin/expenses  { title, category, amount, expenseDate: "YYYY-MM-DD", notes? } — Admin only
export async function POST(req: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const parsed = parseExpenseInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });

  try {
    const expense = await prisma.expense.create({ data: { ...parsed.data, addedById: auth.session.sub }, select: { id: true } });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    console.error("Create expense failed:", err);
    return NextResponse.json({ error: "Could not save the expense. Try again." }, { status: 500 });
  }
}
