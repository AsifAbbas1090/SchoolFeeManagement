import { prisma } from "@/lib/prisma";
import { startOfDay, startOfMonth } from "@/lib/time";

// A manager's own expenses reduce their cash in hand as soon as they're recorded (the cash is
// physically spent). REJECTED ones don't — Admin refused them, so that money is still owed.
export const CASH_SPENDING_STATUSES = ["PENDING", "APPROVED"] as const;

export type ManagerTotals = {
  today: number; // collected since midnight (school time)
  thisMonth: number; // collected since the 1st of this month
  collectedAllTime: number;
  submitted: number; // all submissions, pending + confirmed
  submittedConfirmed: number;
  submittedPending: number;
  expensesApproved: number; // cash this manager spent on school expenses, approved by Admin
  expensesPending: number; // ...still waiting for Admin
  inHand: number; // collected − submitted − expenses: cash still with this manager
  // Breakdown of inHand for the Submit page: carriedOver + today − submittedToday − spentToday = inHand
  carriedOver: number;
  submittedToday: number;
  spentToday: number;
};

type Sum = { _sum: { amount: number | null } };
const s = (r: Sum) => r._sum.amount ?? 0;

// Every figure is scoped to ONE manager. managerId is required, so there is no code path
// that can accidentally sum across managers.
export async function getManagerTotals(managerId: string, now: Date = new Date()): Promise<ManagerTotals> {
  if (!managerId) throw new Error("getManagerTotals requires a managerId");
  const mine = { collectedById: managerId };
  const myExpenses = { addedById: managerId, status: { in: [...CASH_SPENDING_STATUSES] } };
  const today = { gte: startOfDay(), lte: now };

  const [todayC, monthC, allC, subs, subsToday, exp, expToday] = await Promise.all([
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...mine, paymentDate: today } }),
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...mine, paymentDate: { gte: startOfMonth(), lte: now } } }),
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: mine }),
    prisma.submission.groupBy({ by: ["status"], _sum: { amount: true }, where: { submittedById: managerId } }),
    prisma.submission.aggregate({ _sum: { amount: true }, where: { submittedById: managerId, submissionDate: today } }),
    prisma.expense.groupBy({ by: ["status"], _sum: { amount: true }, where: myExpenses }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...myExpenses, createdAt: today } }),
  ]);

  const subBy = (st: "PENDING" | "CONFIRMED") => subs.find((x) => x.status === st)?._sum.amount ?? 0;
  const expBy = (st: "PENDING" | "APPROVED") => exp.find((x) => x.status === st)?._sum.amount ?? 0;
  const submittedConfirmed = subBy("CONFIRMED");
  const submittedPending = subBy("PENDING");
  const expensesApproved = expBy("APPROVED");
  const expensesPending = expBy("PENDING");
  const collectedAllTime = s(allC);
  const submitted = submittedConfirmed + submittedPending;
  const inHand = collectedAllTime - submitted - expensesApproved - expensesPending;
  const collectedToday = s(todayC);
  const submittedToday = s(subsToday);
  const spentToday = s(expToday);

  return {
    today: collectedToday,
    thisMonth: s(monthC),
    collectedAllTime,
    submitted,
    submittedConfirmed,
    submittedPending,
    expensesApproved,
    expensesPending,
    inHand,
    carriedOver: inHand - collectedToday + submittedToday + spentToday,
    submittedToday,
    spentToday,
  };
}
