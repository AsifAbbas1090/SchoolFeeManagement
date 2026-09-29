import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseExpenseInput } from "@/lib/expenseInput";

// PATCH /api/admin/expenses/:id — edit any field
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const parsed = parseExpenseInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });

  try {
    const { count } = await prisma.expense.updateMany({ where: { id: params.id, campusId: auth.session.campusId }, data: parsed.data });
    if (count === 0) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Update expense failed:", err);
    return NextResponse.json({ error: "Could not save changes. Try again." }, { status: 500 });
  }
}

// DELETE /api/admin/expenses/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  try {
    const { count } = await prisma.expense.deleteMany({ where: { id: params.id, campusId: auth.session.campusId } });
    if (count === 0) return NextResponse.json({ error: "Expense not found (already deleted?)." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete expense failed:", err);
    return NextResponse.json({ error: "Could not delete. Try again." }, { status: 500 });
  }
}
