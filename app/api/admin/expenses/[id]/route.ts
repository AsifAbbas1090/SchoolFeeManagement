import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseExpenseInput } from "@/lib/expenseInput";

const notFound = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025";

// PATCH /api/admin/expenses/:id — edit any field
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const parsed = parseExpenseInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });

  try {
    await prisma.expense.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (notFound(err)) return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    console.error("Update expense failed:", err);
    return NextResponse.json({ error: "Could not save changes. Try again." }, { status: 500 });
  }
}

// DELETE /api/admin/expenses/:id
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  try {
    await prisma.expense.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (notFound(err)) return NextResponse.json({ error: "Expense not found (already deleted?)." }, { status: 404 });
    console.error("Delete expense failed:", err);
    return NextResponse.json({ error: "Could not delete. Try again." }, { status: 500 });
  }
}
