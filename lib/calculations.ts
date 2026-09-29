// Fee maths — the ONE place the owed / paid / due formula lives.
// Pure functions, no DB access. Used by the student list, student detail, dashboards and reports.
// Change the rules here and every screen follows.

import { addMonthsKey, monthIndex, monthKey, yearMonthInTz } from "@/lib/time";

export type BalanceStudent = {
  admissionFee: number | null;
  monthlyFee: number;
  admissionDate: Date | null;
  createdAt: Date;
  leftAt: Date | null;
};

// Paper Fund amount per month for the student's campus: "YYYY-MM" → rupees. Missing month = not set yet.
export type PaperFundRates = Map<string, number>;

export type Part = { owed: number; paid: number; due: number };

export type StudentBalance = {
  months: number; // months billed so far (tuition and Paper Fund use the same months)
  tuition: Part; // admission fee + monthly fees
  paperFund: Part & { monthsNotSet: number }; // billed months whose PF amount Admin hasn't set yet
  owed: number; // tuition + Paper Fund
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

// The billed months as "YYYY-MM" keys (same rule as monthsBilled).
export function billedMonthKeys(start: Date, end: Date): string[] {
  const first = monthKey(start);
  const n = monthsBilled(start, end);
  return Array.from({ length: n }, (_, i) => addMonthsKey(first, i));
}

function billingWindow(student: BalanceStudent, now: Date) {
  const start = student.admissionDate ?? student.createdAt;
  const end = student.leftAt && student.leftAt < now ? student.leftAt : now;
  return { start, end };
}

/**
 * Tuition:     owed = (admissionFee ?? 0) + monthlyFee × monthsBilled
 * Paper Fund:  owed = Σ campus PF amount for each billed month (a month not set yet adds 0)
 * due = owed − paid, per part and in total.
 *
 * Edge cases:
 * - Null admission fee: counts as 0 for the admission part (never NaN / never breaks the sum).
 * - Admitted mid-month: billing starts at the admission month — no charge for any earlier month.
 *   The admission month itself is billed in full (no pro-rating).
 * - No admissionDate: billing starts from the month the student was added (createdAt).
 * - Marked LEFT: monthly fees and Paper Fund stop after the month in leftAt (that month is billed).
 *   Reactivating clears leftAt, so billing runs from admission to now again.
 * - Paper Fund is decided month by month: until Admin sets a month's amount, that month is counted
 *   in monthsNotSet and owes nothing; once set, every billed student owes it (paid or not).
 * - Known simplification: the CURRENT monthlyFee applies to every month, so a mid-year fee change
 *   also re-prices months already billed. Exact history would need a fee-change table.
 */
export function getStudentBalanceFromTotals(
  student: BalanceStudent,
  paid: { tuition: number; paperFund: number },
  pf: PaperFundRates,
  now: Date = new Date()
): StudentBalance {
  const { start, end } = billingWindow(student, now);
  const keys = billedMonthKeys(start, end);

  const tuitionOwed = (student.admissionFee ?? 0) + student.monthlyFee * keys.length;
  let pfOwed = 0;
  let monthsNotSet = 0;
  for (const k of keys) {
    const amount = pf.get(k);
    if (amount === undefined) monthsNotSet++;
    else pfOwed += amount;
  }

  const tuition = { owed: tuitionOwed, paid: paid.tuition, due: tuitionOwed - paid.tuition };
  const paperFund = { owed: pfOwed, paid: paid.paperFund, due: pfOwed - paid.paperFund, monthsNotSet };
  const owed = tuition.owed + paperFund.owed;
  const totalPaid = tuition.paid + paperFund.paid;
  return { months: keys.length, tuition, paperFund, owed, paid: totalPaid, due: owed - totalPaid };
}

export function getStudentBalance(
  student: BalanceStudent,
  payments: { amount: number; feeType: string }[],
  pf: PaperFundRates,
  now: Date = new Date()
): StudentBalance {
  let tuition = 0;
  let paperFund = 0;
  for (const p of payments) {
    if (p.feeType === "PAPER_FUND") paperFund += p.amount;
    else tuition += p.amount;
  }
  return getStudentBalanceFromTotals(student, { tuition, paperFund }, pf, now);
}

// Is a "YYYY-MM" key within a student's billing window? (used to validate PF payments' month)
export function isBilledMonth(student: BalanceStudent, key: string, now: Date = new Date()): boolean {
  const { start, end } = billingWindow(student, now);
  const i = monthIndex(key);
  return i >= monthIndex(monthKey(start)) && i <= monthIndex(monthKey(end));
}
