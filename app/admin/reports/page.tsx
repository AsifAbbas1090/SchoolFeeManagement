import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { parseDateRange, rangeWhere } from "@/lib/time";
import { datePresets } from "@/lib/presets";
import { feeTypeLabel, formatDateTime, formatRs } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui";
import UrlFilters from "@/components/UrlFilters";

export const metadata = { title: "Reports · Admin" };
export const dynamic = "force-dynamic";

const MAX_ROWS = 1000; // table cap; totals always cover every matching row

type Search = { from?: string; to?: string; manager?: string; student?: string };

export default async function ReportsPage({ searchParams }: { searchParams: Search }) {
  const actor = await requireRole("ADMIN");
  const c = { campusId: actor.campusId };
  const [managers, students] = await Promise.all([
    prisma.user.findMany({ where: { ...c, role: "MANAGER" }, orderBy: [{ isActive: "desc" }, { name: "asc" }], select: { id: true, name: true, isActive: true } }),
    prisma.student.findMany({ where: c, orderBy: { name: "asc" }, select: { id: true, name: true, fatherName: true, className: true } }),
  ]);

  // Only accept ids that exist, so a stale/edited URL can't silently match nothing.
  const managerId = managers.some((m) => m.id === searchParams.manager) ? searchParams.manager : undefined;
  const studentId = students.some((s) => s.id === searchParams.student) ? searchParams.student : undefined;
  const range = parseDateRange(searchParams.from, searchParams.to);

  const where: Prisma.FeePaymentWhereInput = {
    ...c,
    ...(rangeWhere(range) && { paymentDate: rangeWhere(range) }),
    ...(managerId && { collectedById: managerId }),
    ...(studentId && { studentId }),
  };

  const [rows, totals, byType, submitted, expenses] = await Promise.all([
    prisma.feePayment.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      take: MAX_ROWS,
      include: {
        student: { select: { id: true, name: true, className: true } },
        collectedBy: { select: { name: true } },
      },
    }),
    prisma.feePayment.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.feePayment.groupBy({ by: ["feeType"], where, _sum: { amount: true } }),
    // Side-by-side context for the same date range (and manager, when chosen). Students don't
    // submit or spend, so these two ignore the student filter.
    prisma.submission.aggregate({
      _sum: { amount: true },
      where: { ...c, ...(rangeWhere(range) && { submissionDate: rangeWhere(range) }), ...(managerId && { submittedById: managerId }) },
    }),
    managerId
      ? null
      : prisma.expense.aggregate({ _sum: { amount: true }, where: { ...c, status: "APPROVED", ...(rangeWhere(range) && { expenseDate: rangeWhere(range) }) } }),
  ]);

  const total = totals._sum.amount ?? 0;
  const typeSum = (t: "ADMISSION" | "MONTHLY" | "PAPER_FUND") => byType.find((b) => b.feeType === t)?._sum.amount ?? 0;
  const truncated = totals._count > rows.length;

  return (
    <>
      <PageHeader title="Reports" subtitle="Every fee payment — narrow it down by date, manager and student in any combination" />

      <UrlFilters
        presets={datePresets()}
        fields={[
          { name: "from", label: "From", type: "date" },
          { name: "to", label: "To", type: "date" },
          { name: "manager", label: "Manager", type: "select", allLabel: "All managers", options: managers.map((m) => ({ value: m.id, label: m.isActive ? m.name : `${m.name} (inactive)` })) },
          {
            name: "student",
            label: "Student",
            type: "select",
            allLabel: "All students",
            options: students.map((s) => ({ value: s.id, label: `${s.name} (${s.className}) · s/o ${s.fatherName}` })),
          },
        ]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Collected"
          value={formatRs(total)}
          hint={`${totals._count} payment${totals._count === 1 ? "" : "s"} · ${formatRs(typeSum("MONTHLY"))} monthly · ${formatRs(typeSum("PAPER_FUND"))} Paper Fund · ${formatRs(typeSum("ADMISSION"))} admission`}
        />
        <StatCard label="Submitted to Admin" value={formatRs(submitted._sum.amount ?? 0)} hint={managerId ? "By this manager, same dates" : "All managers, same dates"} />
        {expenses && <StatCard label="Expenses" value={formatRs(expenses._sum.amount ?? 0)} hint="Same dates" />}
        {expenses && <StatCard label="Net" value={formatRs(total - (expenses._sum.amount ?? 0))} hint="Collected − expenses" />}
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Fee type</th>
              <th className="px-4 py-3 font-medium">Collected by</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(p.paymentDate)}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/students/${p.student.id}`} className="text-accent hover:underline">{p.student.name}</Link>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5">{p.student.className}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{feeTypeLabel(p.feeType, p.forMonth)}</td>
                <td className="px-4 py-2.5">{p.collectedBy.name}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums">{formatRs(p.amount)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No payments match these filters.</td></tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-border">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right font-medium">
                Total{truncated && <span className="ml-1 font-normal text-muted">(all {totals._count} matches; table shows newest {rows.length})</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums">{formatRs(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
