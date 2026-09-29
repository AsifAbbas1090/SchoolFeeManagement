// Student data access. Every function is scoped to ONE campus (campusId from the signed-in user).
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStudentBalance, getStudentBalanceFromTotals, type PaperFundRates } from "@/lib/calculations";

export type StudentRow = {
  id: string;
  name: string;
  fatherName: string;
  className: string;
  phoneNumber: string;
  monthlyFee: number;
  admissionFee: number | null;
  status: "ACTIVE" | "LEFT";
  tuitionDue: number;
  pfDue: number;
  pfNotSet: number; // billed months whose Paper Fund amount isn't set yet
  due: number; // total owed − paid; negative = paid in advance
};

// Paper Fund amount per month for a campus. Cached per request (several callers need it).
export const loadPaperFundRates = cache(async (campusId: string): Promise<PaperFundRates> => {
  const rows = await prisma.monthlyCharge.findMany({
    where: { campusId, kind: "PAPER_FUND" },
    select: { forMonth: true, amount: true },
  });
  return new Map(rows.map((r) => [r.forMonth, r.amount]));
});

const rowSelect = {
  id: true,
  name: true,
  fatherName: true,
  className: true,
  phoneNumber: true,
  monthlyFee: true,
  admissionFee: true,
  admissionDate: true,
  createdAt: true,
  leftAt: true,
  status: true,
} satisfies Prisma.StudentSelect;

// Dues for a set of students: 1 query for students + 1 grouped sum of payments + PF rates.
async function rowsWithDues(campusId: string, where: Prisma.StudentWhereInput, take?: number): Promise<StudentRow[]> {
  const [students, pf] = await Promise.all([
    prisma.student.findMany({ where: { ...where, campusId }, orderBy: { name: "asc" }, select: rowSelect, take }),
    loadPaperFundRates(campusId),
  ]);
  if (students.length === 0) return [];
  const sums = await prisma.feePayment.groupBy({
    by: ["studentId", "feeType"],
    where: { campusId, studentId: { in: students.map((s) => s.id) } },
    _sum: { amount: true },
  });
  const paid = new Map<string, { tuition: number; paperFund: number }>();
  for (const r of sums) {
    const p = paid.get(r.studentId) ?? { tuition: 0, paperFund: 0 };
    if (r.feeType === "PAPER_FUND") p.paperFund += r._sum.amount ?? 0;
    else p.tuition += r._sum.amount ?? 0;
    paid.set(r.studentId, p);
  }
  const now = new Date();
  return students.map((s) => {
    const b = getStudentBalanceFromTotals(s, paid.get(s.id) ?? { tuition: 0, paperFund: 0 }, pf, now);
    return {
      id: s.id,
      name: s.name,
      fatherName: s.fatherName,
      className: s.className,
      phoneNumber: s.phoneNumber,
      monthlyFee: s.monthlyFee,
      admissionFee: s.admissionFee,
      status: s.status,
      tuitionDue: b.tuition.due,
      pfDue: b.paperFund.due,
      pfNotSet: b.paperFund.monthsNotSet,
      due: b.due,
    };
  });
}

const textMatch = (q: string): Prisma.StudentWhereInput => ({
  OR: [
    { name: { contains: q, mode: "insensitive" } },
    { fatherName: { contains: q, mode: "insensitive" } },
    { className: { contains: q, mode: "insensitive" } },
  ],
});

export const PAGE_SIZE = 50;

export type StudentListQuery = { q?: string; onlyDue?: boolean; includeLeft?: boolean; page?: number };

// Students page: search / filter on the server, one page at a time.
export async function listStudents(campusId: string, query: StudentListQuery) {
  const q = query.q?.trim() ?? "";
  const where: Prisma.StudentWhereInput = {
    ...(query.includeLeft ? {} : { status: "ACTIVE" }),
    ...(q ? textMatch(q) : {}),
  };
  const [matching, activeCount, leftCount] = await Promise.all([
    rowsWithDues(campusId, where),
    prisma.student.count({ where: { campusId, status: "ACTIVE" } }),
    prisma.student.count({ where: { campusId, status: "LEFT" } }),
  ]);
  // "only with dues" depends on computed balances, so it filters after the maths.
  const filtered = query.onlyDue ? matching.filter((s) => s.due > 0) : matching;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, query.page ?? 1), pages);
  return {
    rows: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    pages,
    activeCount,
    leftCount,
  };
}

// Record-payment search: top matches that can be paid (active, or left but still owing).
export async function searchPayableStudents(campusId: string, q: string, limit = 8): Promise<StudentRow[]> {
  const term = q.trim();
  if (term.length < 1) return [];
  const candidates = await rowsWithDues(campusId, textMatch(term), 40);
  return candidates.filter((s) => s.status === "ACTIVE" || s.due > 0).slice(0, limit);
}

// Campus-wide totals for dashboards.
export async function campusDueTotals(campusId: string) {
  const all = await rowsWithDues(campusId, {});
  const owing = all.filter((s) => s.due > 0);
  return {
    studentsOwing: owing.length,
    totalDue: owing.reduce((s, x) => s + x.due, 0),
    tuitionDue: all.reduce((s, x) => s + Math.max(0, x.tuitionDue), 0),
    pfDue: all.reduce((s, x) => s + Math.max(0, x.pfDue), 0),
  };
}

export async function getStudentDetail(campusId: string, id: string) {
  const [student, pf] = await Promise.all([
    prisma.student.findFirst({
      where: { id, campusId },
      include: {
        createdBy: { select: { name: true } },
        feePayments: {
          orderBy: { paymentDate: "desc" },
          include: { collectedBy: { select: { name: true, username: true } } },
        },
      },
    }),
    loadPaperFundRates(campusId),
  ]);
  if (!student) return null;
  return { student, balance: getStudentBalance(student, student.feePayments, pf) };
}
