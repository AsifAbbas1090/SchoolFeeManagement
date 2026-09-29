// "Who approved what" across all admins of ONE campus: confirmed cash hand-overs and
// approved/rejected manager expenses, newest first. Shown on every admin's dashboard.
import { prisma } from "@/lib/prisma";

export type Approval = {
  id: string;
  kind: "SUBMISSION_CONFIRMED" | "EXPENSE_APPROVED" | "EXPENSE_REJECTED";
  at: Date;
  adminName: string; // who confirmed / reviewed
  managerName: string; // who submitted / spent
  amount: number;
  detail: string | null; // expense title, or submission notes
};

export async function getRecentApprovals(campusId: string, limit = 10): Promise<Approval[]> {
  const [subs, exps] = await Promise.all([
    prisma.submission.findMany({
      where: { campusId, status: "CONFIRMED", confirmedAt: { not: null } },
      orderBy: { confirmedAt: "desc" },
      take: limit,
      select: {
        id: true, amount: true, confirmedAt: true, notes: true,
        confirmedBy: { select: { name: true } }, submittedBy: { select: { name: true } },
      },
    }),
    prisma.expense.findMany({
      where: { campusId, reviewedAt: { not: null }, status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: limit,
      select: {
        id: true, amount: true, reviewedAt: true, title: true, status: true,
        reviewedBy: { select: { name: true } }, addedBy: { select: { name: true } },
      },
    }),
  ]);

  const rows: Approval[] = [
    ...subs.map((s) => ({
      id: `s_${s.id}`,
      kind: "SUBMISSION_CONFIRMED" as const,
      at: s.confirmedAt!,
      adminName: s.confirmedBy?.name ?? "Admin",
      managerName: s.submittedBy.name,
      amount: s.amount,
      detail: s.notes,
    })),
    ...exps.map((e) => ({
      id: `e_${e.id}`,
      kind: e.status === "APPROVED" ? ("EXPENSE_APPROVED" as const) : ("EXPENSE_REJECTED" as const),
      at: e.reviewedAt!,
      adminName: e.reviewedBy?.name ?? "Admin",
      managerName: e.addedBy.name,
      amount: e.amount,
      detail: e.title,
    })),
  ];
  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
