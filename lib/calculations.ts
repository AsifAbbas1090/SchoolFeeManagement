// Fee maths — the ONE place the owed / paid / due formula lives.
// Pure functions, no DB access. Used by the student list, student detail, and (later) reports
// and manager reconciliation. Change the rules here and every screen follows.

import { yearMonthInTz } from "@/lib/time";

export type BalanceStudent = {
  admissionFee: number | null;
  monthlyFee: number;
  admissionDate: Date | null;
  createdAt: Date;
  leftAt: Date | null;
};

export type StudentBalance = {
  months: number; // monthly fees billed so far
  owed: number;
  paid: number;
  due: number; // owed − paid; negative = paid in advance
};

/**
 * Number of monthly fees billed between `start` and `end`, counting BOTH the start month and the
 * end month (admitted 15 Sept, today 2 Oct → 2: Sept + Oct). Months are in school time.
 * Returns 0 when start is after end (e.g. an admission date set in the future).
 */
export function monthsBilled(start: Date, end: Date): number {
  const s = yearMonthInTz(start);
  const e = yearMonthInTz(end);
  return Math.max(0, (e.year - s.year) * 12 + (e.month - s.month) + 1);
}

/**
 * owed = (admissionFee ?? 0) + monthlyFee × monthsBilled
 * paid = sum of payment amounts
 * due  = owed − paid
 *
 * Edge cases:
 * - Null admission fee: counts as 0 for the admission part (never NaN / never breaks the sum).
 * - Admitted mid-month: billing starts at the admission month — no charge for any earlier month.
 *   The admission month itself is billed in full (no pro-rating).
 * - No admissionDate: billing starts from the month the student was added (createdAt).
 * - Marked LEFT: monthly fees stop accruing after the month in leftAt (that month is still billed).
 *   Reactivating clears leftAt, so billing runs from admission to now again.
 * - Known simplification: the CURRENT monthlyFee applies to every month, so a mid-year fee change
 *   also re-prices months already billed. Exact history would need a fee-change table.
 */
export function getStudentBalanceFromTotal(student: BalanceStudent, paid: number, now: Date = new Date()): StudentBalance {
  const start = student.admissionDate ?? student.createdAt;
  const end = student.leftAt && student.leftAt < now ? student.leftAt : now;
  const months = monthsBilled(start, end);
  const owed = (student.admissionFee ?? 0) + student.monthlyFee * months;
  return { months, owed, paid, due: owed - paid };
}

export function getStudentBalance(
  student: BalanceStudent,
  payments: { amount: number }[],
  now: Date = new Date()
): StudentBalance {
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  return getStudentBalanceFromTotal(student, paid, now);
}
