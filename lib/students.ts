import { prisma } from "@/lib/prisma";
import { getStudentBalance, getStudentBalanceFromTotal } from "@/lib/calculations";

export type StudentRow = {
  id: string;
  name: string;
  fatherName: string;
  className: string;
  phoneNumber: string;
  monthlyFee: number;
  admissionFee: number | null;
  status: "ACTIVE" | "LEFT";
  due: number; // owed − paid; negative = paid in advance
};

// All students (active + left) with their current balance. The list filters client-side.
export async function listStudentsWithDues(): Promise<StudentRow[]> {
  const [students, paidByStudent] = await Promise.all([
    prisma.student.findMany({ orderBy: { name: "asc" } }),
    prisma.feePayment.groupBy({ by: ["studentId"], _sum: { amount: true } }),
  ]);
  const paid = new Map(paidByStudent.map((p) => [p.studentId, p._sum.amount ?? 0]));
  const now = new Date();

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    fatherName: s.fatherName,
    className: s.className,
    phoneNumber: s.phoneNumber,
    monthlyFee: s.monthlyFee,
    admissionFee: s.admissionFee,
    status: s.status,
    due: getStudentBalanceFromTotal(s, paid.get(s.id) ?? 0, now).due,
  }));
}

export async function getStudentDetail(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      feePayments: {
        orderBy: { paymentDate: "desc" },
        include: { collectedBy: { select: { name: true, username: true } } },
      },
    },
  });
  if (!student) return null;

  return { student, balance: getStudentBalance(student, student.feePayments) };
}
