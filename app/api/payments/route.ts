import { NextResponse } from "next/server";
import type { FeeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parsePositiveRupees } from "@/lib/money";
import { monthIndex, monthKey } from "@/lib/time";

const MAX_MONTHS_AHEAD = 12; // advance payments allowed up to a year ahead

type Kind = "ADMISSION" | "MONTHLY" | "PAPER_FUND" | "MONTHLY_PF";
type Fields = Partial<Record<"studentId" | "feeType" | "forMonth" | "amount" | "pfAmount" | "notes", string>>;

// POST /api/payments
//   { studentId, feeType: "ADMISSION" | "MONTHLY" | "PAPER_FUND" | "MONTHLY_PF", forMonth?, amount, pfAmount?, notes? }
// MONTHLY_PF = monthly fee + Paper Fund for the same month in one go (two rows, one transaction).
// Manager only. collectedById and campusId always come from the signed-in manager, never the body;
// the student must belong to the same campus.
export async function POST(req: Request) {
  const auth = await requireApiRole("MANAGER");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const fields: Fields = {};
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const kind = body.feeType as Kind;
  const rawMonth = typeof body.forMonth === "string" ? body.forMonth.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const needsMonth = kind === "MONTHLY" || kind === "PAPER_FUND" || kind === "MONTHLY_PF";

  if (!studentId) fields.studentId = "Select a student.";
  if (!["ADMISSION", "MONTHLY", "PAPER_FUND", "MONTHLY_PF"].includes(kind)) fields.feeType = "Choose a fee type.";
  const amount = parsePositiveRupees(body.amount);
  if (amount === "invalid") fields.amount = "Enter a whole rupee amount greater than 0 (digits only).";
  const pfAmount = kind === "MONTHLY_PF" ? parsePositiveRupees(body.pfAmount) : null;
  if (pfAmount === "invalid") fields.pfAmount = "Enter the Paper Fund amount (digits only, greater than 0).";
  if (notes.length > 200) fields.notes = "Notes must be 200 characters or fewer.";

  let forMonth: string | null = null;
  if (needsMonth) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)) fields.forMonth = "Pick which month this is for.";
    else if (monthIndex(rawMonth) > monthIndex(monthKey()) + MAX_MONTHS_AHEAD) fields.forMonth = "That month is too far ahead.";
    else if (Number(rawMonth.slice(0, 4)) < 2000) fields.forMonth = "That month is too far back.";
    else forMonth = rawMonth;
  }

  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields }, { status: 400 });
  }

  const campusId = auth.session.campusId;
  const student = await prisma.student.findFirst({ where: { id: studentId, campusId }, select: { id: true, name: true } });
  if (!student) return NextResponse.json({ error: "Student not found.", fields: { studentId: "Student not found." } }, { status: 404 });

  const base = { studentId: student.id, collectedById: auth.session.sub, campusId, notes: notes || null };
  const rows: { amount: number; feeType: FeeType; forMonth: string | null }[] =
    kind === "MONTHLY_PF"
      ? [
          { amount: amount as number, feeType: "MONTHLY", forMonth },
          { amount: pfAmount as number, feeType: "PAPER_FUND", forMonth },
        ]
      : [{ amount: amount as number, feeType: kind as FeeType, forMonth: kind === "ADMISSION" ? null : forMonth }];

  try {
    const payments = await prisma.$transaction(
      rows.map((r) =>
        prisma.feePayment.create({
          data: { ...base, ...r },
          select: { id: true, amount: true, feeType: true, forMonth: true, paymentDate: true },
        })
      )
    );
    const total = payments.reduce((s, p) => s + p.amount, 0);
    return NextResponse.json({ payment: { ...payments[0], amount: total }, payments, student }, { status: 201 });
  } catch (err) {
    console.error("Record payment failed:", err);
    return NextResponse.json({ error: "Could not save the payment. Try again." }, { status: 500 });
  }
}
