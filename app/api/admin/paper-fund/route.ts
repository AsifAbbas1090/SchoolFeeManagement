import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseRupees } from "@/lib/money";
import { monthIndex, monthKey } from "@/lib/time";

const MAX_PF = 100_000;
const MAX_MONTHS_AHEAD = 12;

// POST /api/admin/paper-fund  { forMonth: "YYYY-MM", amount }
// Sets (or changes) this campus's Paper Fund for one month. Every student billed that month then
// owes it. Rs 0 is allowed and means "no Paper Fund this month".
export async function POST(req: Request) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const fields: Record<string, string> = {};
  const forMonth = typeof body.forMonth === "string" ? body.forMonth.trim() : "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(forMonth)) fields.forMonth = "Pick a month.";
  else if (monthIndex(forMonth) > monthIndex(monthKey()) + MAX_MONTHS_AHEAD) fields.forMonth = "That month is too far ahead.";
  else if (Number(forMonth.slice(0, 4)) < 2000) fields.forMonth = "That month is too far back.";
  const amount = parseRupees(body.amount, MAX_PF);
  if (amount === null || amount === "invalid") fields.amount = "Enter a whole rupee amount (0 or more, digits only).";
  if (Object.keys(fields).length) return NextResponse.json({ error: "Please fix the highlighted fields.", fields }, { status: 400 });

  const campusId = auth.session.campusId;
  const charge = await prisma.monthlyCharge.upsert({
    where: { campusId_kind_forMonth: { campusId, kind: "PAPER_FUND", forMonth } },
    update: { amount: amount as number, setById: auth.session.sub },
    create: { campusId, kind: "PAPER_FUND", forMonth, amount: amount as number, setById: auth.session.sub },
    select: { forMonth: true, amount: true },
  });
  return NextResponse.json({ charge });
}
