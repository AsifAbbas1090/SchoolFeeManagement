import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never prerender — must query the live DB on every request.
export const dynamic = "force-dynamic";

// GET /api/health
// Proves the app can reach the Supabase Postgres DB and returns row counts.
export async function GET() {
  try {
    const [users, students, feePayments, submissions, expenses] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.feePayment.count(),
      prisma.submission.count(),
      prisma.expense.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      db: "connected",
      counts: { users, students, feePayments, submissions, expenses },
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", message: (err as Error).message },
      { status: 500 }
    );
  }
}
