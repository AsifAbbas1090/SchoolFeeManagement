// Reconciliation: how much each manager collected vs handed to Admin, and what's still with them.
import { prisma } from "@/lib/prisma";
import { calendarDaysBetween, rangeWhere, type DateRange } from "@/lib/time";

// Flag thresholds — tune to the school. A manager is flagged when the cash still with them is
// at least LARGE_HOLDING, OR some of it has been held for OLD_HOLDING_DAYS days or more.
export const LARGE_HOLDING = 50_000;
export const OLD_HOLDING_DAYS = 3;

export type Reconciliation = {
  managerId: string;
  name: string;
  username: string;
  collected: number;
  submitted: number; // pending + confirmed
  confirmed: number;
  pending: number;
  stillWith: number; // collected − submitted
  holdingSince: Date | null; // oldest collection not yet covered by submissions (all-time view only)
  daysHeld: number | null;
  flagLarge: boolean;
  flagOld: boolean;
};

/**
 * Oldest payment still in the manager's hand, assuming submissions hand over the OLDEST cash first
 * (first-in, first-out). Walk payments oldest→newest; the first one that pushes the running total
 * past everything submitted is the oldest rupee not yet handed over.
 */
export function holdingSince(paymentsAsc: { amount: number; paymentDate: Date }[], submittedTotal: number): Date | null {
  let running = 0;
  for (const p of paymentsAsc) {
    running += p.amount;
    if (running > submittedTotal) return p.paymentDate;
  }
  return null;
}

export async function getReconciliation(opts: { managerId?: string; range?: DateRange } = {}, now = new Date()): Promise<Reconciliation[]> {
  const dates = opts.range ? rangeWhere(opts.range) : undefined;
  const allTime = !dates;

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", ...(opts.managerId && { id: opts.managerId }) },
    orderBy: { name: "asc" },
    select: { id: true, name: true, username: true },
  });
  const ids = managers.map((m) => m.id);
  if (ids.length === 0) return [];

  const [collected, submitted] = await Promise.all([
    prisma.feePayment.groupBy({
      by: ["collectedById"],
      where: { collectedById: { in: ids }, ...(dates && { paymentDate: dates }) },
      _sum: { amount: true },
    }),
    prisma.submission.groupBy({
      by: ["submittedById", "status"],
      where: { submittedById: { in: ids }, ...(dates && { submissionDate: dates }) },
      _sum: { amount: true },
    }),
  ]);

  const collectedBy = new Map(collected.map((c) => [c.collectedById, c._sum.amount ?? 0]));
  const sub = (id: string, status: "PENDING" | "CONFIRMED") =>
    submitted.find((s) => s.submittedById === id && s.status === status)?._sum.amount ?? 0;

  const rows = managers.map((m) => {
    const c = collectedBy.get(m.id) ?? 0;
    const confirmed = sub(m.id, "CONFIRMED");
    const pending = sub(m.id, "PENDING");
    const stillWith = c - confirmed - pending;
    return {
      managerId: m.id,
      name: m.name,
      username: m.username,
      collected: c,
      submitted: confirmed + pending,
      confirmed,
      pending,
      stillWith,
      holdingSince: null as Date | null,
      daysHeld: null as number | null,
      flagLarge: stillWith >= LARGE_HOLDING,
      flagOld: false,
    };
  });

  // "How long has it been held" only makes sense against the full history.
  const holders = rows.filter((r) => allTime && r.stillWith > 0);
  if (holders.length) {
    const payments = await prisma.feePayment.findMany({
      where: { collectedById: { in: holders.map((h) => h.managerId) } },
      orderBy: { paymentDate: "asc" },
      select: { amount: true, paymentDate: true, collectedById: true },
    });
    for (const r of holders) {
      const since = holdingSince(payments.filter((p) => p.collectedById === r.managerId), r.submitted);
      r.holdingSince = since;
      r.daysHeld = since ? calendarDaysBetween(since, now) : null;
      r.flagOld = r.daysHeld !== null && r.daysHeld >= OLD_HOLDING_DAYS;
    }
  }
  return rows;
}
