import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { monthIndex, monthKey } from "@/lib/time";

const MAX_AMOUNT = 10_000_000;
const MAX_MONTHS_AHEAD = 12; // advance payments allowed up to a year ahead

type Fields = Partial<Record<"studentId" | "feeType" | "forMonth" | "amount" | "notes", string>>;

// POST /api/payments  { studentId, feeType: "ADMISSION" | "MONTHLY", forMonth?: "YYYY-MM", amount, notes? }
// Manager only. collectedById always comes from the session, never from the request body.
export async function POST(req: Request) {
  const auth = await requireApiRole("MANAGER");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const fields: Fields = {};
  const studentId = typeof body.studentId === "string" ? body.studentId : "";
  const feeType = body.feeType;
  const rawMonth = typeof body.forMonth === "string" ? body.forMonth.trim() : "";
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const amount = typeof body.amount === "number" ? body.amount : Number(String(body.amount ?? "").replace(/,/g, "").trim());

  if (!studentId) fields.studentId = "Select a student.";
  if (feeType !== "ADMISSION" && feeType !== "MONTHLY") fields.feeType = "Choose Admission or Monthly.";
  if (!Number.isInteger(amount) || amount <= 0) fields.amount = "Enter a whole rupee amount greater than 0.";
  else if (amount > MAX_AMOUNT) fields.amount = "Amount is too large.";
  if (notes.length > 200) fields.notes = "Notes must be 200 characters or fewer.";

  let forMonth: string | null = null;
  if (feeType === "MONTHLY") {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth)) fields.forMonth = "Pick which month this fee is for.";
    else if (monthIndex(rawMonth) > monthIndex(monthKey()) + MAX_MONTHS_AHEAD) fields.forMonth = "That month is too far ahead.";
    else if (Number(rawMonth.slice(0, 4)) < 2000) fields.forMonth = "That month is too far back.";
    else forMonth = rawMonth;
  }

  if (Object.keys(fields).length) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields }, { status: 400 });
  }

  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true, name: true } });
  if (!student) return NextResponse.json({ error: "Student not found.", fields: { studentId: "Student not found." } }, { status: 404 });

  try {
    const payment = await prisma.feePayment.create({
      data: {
        studentId: student.id,
        collectedById: auth.session.sub,
        amount,
        feeType,
        forMonth,
        notes: notes || null,
      },
      select: { id: true, amount: true, feeType: true, forMonth: true, paymentDate: true },
    });
    return NextResponse.json({ payment, student }, { status: 201 });
  } catch (err) {
    console.error("Record payment failed:", err);
    return NextResponse.json({ error: "Could not save the payment. Try again." }, { status: 500 });
  }
}
