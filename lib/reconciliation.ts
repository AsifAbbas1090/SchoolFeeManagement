// Reconciliation: how much each manager collected vs handed to Admin, and what's still with them.
import { prisma } from "@/lib/prisma";
import { calendarDaysBetween, rangeWhere, type DateRange } from "@/lib/time";
import { CASH_SPENDING_STATUSES } from "@/lib/stats";

// Flag thresholds — tune to the school. A manager is flagged when the cash still with them is
// at least LARGE_HOLDING, OR some of it has been held for OLD_HOLDING_DAYS days or more.
export const LARGE_HOLDING = 50_000;
export const OLD_HOLDING_DAYS = 3;

export type Reconciliation = {
  managerId: string;
  name: string;
  username: string;
  isActive: boolean; // deactivated managers stay listed so any cash still with them is visible
  collected: number;
  submitted: number; // pending + confirmed
  confirmed: number;
  pending: number;
  spent: number; // manager's own expenses paid from collected cash (pending + approved)
  spentPending: number; // ...of which Admin hasn't reviewed yet
  stillWith: number; // collected − submitted − spent
  holdingSince: Date | null; // oldest collection not yet covered by submissions (all-time view only)
  daysHeld: number | null;
  flagLarge: boolean;
  flagOld: boolean;
};

// "Holding since" = the oldest payment still in the manager's hand, assuming submissions and
// expenses hand over the OLDEST cash first (first-in, first-out) — computed in SQL below.
export async function getReconciliation(
  opts: { campusId: string; managerId?: string; range?: DateRange },
  now = new Date()
): Promise<Reconciliation[]> {
  const dates = opts.range ? rangeWhere(opts.range) : undefined;
  const allTime = !dates;

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER", campusId: opts.campusId, ...(opts.managerId && { id: opts.managerId }) },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, username: true, isActive: true },
  });
  const ids = managers.map((m) => m.id);
  if (ids.length === 0) return [];

  const [collected, submitted, expenses] = await Promise.all([
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
    prisma.expense.groupBy({
      by: ["addedById", "status"],
      where: { addedById: { in: ids }, status: { in: [...CASH_SPENDING_STATUSES] }, ...(dates && { expenseDate: dates }) },
      _sum: { amount: true },
    }),
  ]);

  const collectedBy = new Map(collected.map((c) => [c.collectedById, c._sum.amount ?? 0]));
  const sub = (id: string, status: "PENDING" | "CONFIRMED") =>
    submitted.find((s) => s.submittedById === id && s.status === status)?._sum.amount ?? 0;
  const exp = (id: string, status: "PENDING" | "APPROVED") =>
    expenses.find((e) => e.addedById === id && e.status === status)?._sum.amount ?? 0;

  const rows = managers.map((m) => {
    const c = collectedBy.get(m.id) ?? 0;
    const confirmed = sub(m.id, "CONFIRMED");
    const pending = sub(m.id, "PENDING");
    const spentPending = exp(m.id, "PENDING");
    const spent = exp(m.id, "APPROVED") + spentPending;
    const stillWith = c - confirmed - pending - spent;
    return {
      managerId: m.id,
      name: m.name,
      username: m.username,
      isActive: m.isActive,
      collected: c,
      submitted: confirmed + pending,
      confirmed,
      pending,
      spent,
      spentPending,
      stillWith,
      holdingSince: null as Date | null,
      daysHeld: null as number | null,
      flagLarge: stillWith >= LARGE_HOLDING,
      flagOld: false,
    };
  });

  // "How long has it been held" only makes sense against the full history. One indexed window
  // query per holder finds the oldest payment not yet covered (FIFO) without loading every payment.
  const holders = rows.filter((r) => allTime && r.stillWith > 0);
  await Promise.all(
    holders.map(async (r) => {
      const found = await prisma.$queryRaw<{ paymentDate: Date }[]>`
        SELECT "paymentDate" FROM (
          SELECT "paymentDate", SUM(amount) OVER (ORDER BY "paymentDate", id) AS running
          FROM fee_payments WHERE "collectedById" = ${r.managerId}
        ) t
        WHERE running > ${r.submitted + r.spent}
        ORDER BY running LIMIT 1`;
      const since = found[0]?.paymentDate ?? null;
      r.holdingSince = since;
      r.daysHeld = since ? calendarDaysBetween(since, now) : null;
      r.flagOld = r.daysHeld !== null && r.daysHeld >= OLD_HOLDING_DAYS;
    })
  );
  return rows;
}
