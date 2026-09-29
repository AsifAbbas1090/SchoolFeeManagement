import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";

// Never prerender — must query the live DB on every request.
export const dynamic = "force-dynamic";

// Written by the server's db-backup timer after each successful copy to Supabase.
const BACKUP_STATUS = "/var/lib/school-fee/backup-status.json";
const STALE_AFTER_S = 60 * 60; // the timer runs every 15 min; > 1 h means backups have stopped

async function backupState() {
  try {
    const s = JSON.parse(await readFile(BACKUP_STATUS, "utf8")) as { lastSuccessUtc: string; epoch: number };
    const ageS = Math.floor(Date.now() / 1000) - s.epoch;
    return { status: ageS > STALE_AFTER_S ? "stale" : "ok", lastSuccessUtc: s.lastSuccessUtc, ageMinutes: Math.round(ageS / 60) };
  } catch {
    return { status: "not-configured" }; // e.g. local development
  }
}

// GET /api/health — live DB reachable + row counts + freshness of the Supabase backup copy.
export async function GET() {
  try {
    const [users, students, feePayments, submissions, expenses, backup] = await Promise.all([
      prisma.user.count(),
      prisma.student.count(),
      prisma.feePayment.count(),
      prisma.submission.count(),
      prisma.expense.count(),
      backupState(),
    ]);

    return NextResponse.json({
      status: "ok",
      db: "connected",
      counts: { users, students, feePayments, submissions, expenses },
      backup,
    });
  } catch (err) {
    return NextResponse.json({ status: "error", db: "unreachable", message: (err as Error).message }, { status: 500 });
  }
}
