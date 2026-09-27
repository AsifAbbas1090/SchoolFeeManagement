import { prisma } from "@/lib/prisma";
import { startOfDay, startOfMonth } from "@/lib/time";

export type ManagerTotals = {
  today: number; // collected since midnight (school time)
  thisMonth: number; // collected since the 1st of this month
  collectedAllTime: number;
  submitted: number; // all submissions, pending + confirmed
  submittedConfirmed: number;
  submittedPending: number;
  inHand: number; // collected − submitted: cash still with this manager
};

// Every figure is scoped to ONE manager. managerId is required, so there is no code path
// that can accidentally sum across managers.
export async function getManagerTotals(managerId: string, now: Date = new Date()): Promise<ManagerTotals> {
  if (!managerId) throw new Error("getManagerTotals requires a managerId");
  const mine = { collectedById: managerId };

  const [today, thisMonth, all, subs] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...mine, paymentDate: { gte: startOfDay(), lte: now } } }),
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...mine, paymentDate: { gte: startOfMonth(), lte: now } } }),
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: mine }),
    prisma.submission.groupBy({ by: ["status"], _sum: { amount: true }, where: { submittedById: managerId } }),
  ]);

  const byStatus = (s: "PENDING" | "CONFIRMED") => subs.find((x) => x.status === s)?._sum.amount ?? 0;
  const submittedConfirmed = byStatus("CONFIRMED");
  const submittedPending = byStatus("PENDING");
  const collectedAllTime = all._sum.amount ?? 0;
  const submitted = submittedConfirmed + submittedPending;

  return {
    today: today._sum.amount ?? 0,
    thisMonth: thisMonth._sum.amount ?? 0,
    collectedAllTime,
    submitted,
    submittedConfirmed,
    submittedPending,
    inHand: collectedAllTime - submitted,
  };
}
