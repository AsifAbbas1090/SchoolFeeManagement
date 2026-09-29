import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { dayKey, parseDateRange, rangeWhere, startOfDay, startOfMonth } from "@/lib/time";
import { EXPENSE_CATEGORIES } from "@/lib/expenseInput";
import { datePresets } from "@/lib/presets";
import { formatDate, formatRs } from "@/lib/format";
import { PageHeader, StatCard, primaryButtonClass } from "@/components/ui";
import UrlFilters from "@/components/UrlFilters";
import DeleteExpenseButton from "./DeleteExpenseButton";
import ReviewButtons from "./ReviewButtons";

export const metadata = { title: "Expenses · Admin" };
export const dynamic = "force-dynamic";

type Search = { saved?: string; from?: string; to?: string; category?: string };

export default async function ExpensesPage({ searchParams }: { searchParams: Search }) {
  const actor = await requireRole("ADMIN");
  const c = { campusId: actor.campusId };
  const range = parseDateRange(searchParams.from, searchParams.to);
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(searchParams.category ?? "") ? searchParams.category : undefined;
  // School expenses = APPROVED only. Managers' pending claims are reviewed in their own section above.
  const where: Prisma.ExpenseWhereInput = {
    ...c,
    status: "APPROVED",
    ...(rangeWhere(range) && { expenseDate: rangeWhere(range) }),
    ...(category && { category }),
  };
  const filtered = Boolean(where.expenseDate || where.category);
  const yearStart = startOfDay(`${dayKey().slice(0, 4)}-01-01`); // 1 Jan, school time

  const [expenses, filteredSum, month, year, pendingReview] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: [{ expenseDate: "desc" }, { createdAt: "desc" }],
      include: { addedBy: { select: { name: true, role: true } }, reviewedBy: { select: { name: true } } },
    }),
    prisma.expense.aggregate({ _sum: { amount: true }, _count: true, where }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...c, status: "APPROVED", expenseDate: { gte: startOfMonth() } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { ...c, status: "APPROVED", expenseDate: { gte: yearStart } } }),
    prisma.expense.findMany({
      where: { ...c, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { addedBy: { select: { name: true } } },
    }),
  ]);

  const saved = searchParams.saved === "added" ? "Expense added." : searchParams.saved === "updated" ? "Expense updated." : null;
  const n = filteredSum._count;

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="School running costs"
        action={<Link href="/admin/expenses/new" className={primaryButtonClass}>Add expense</Link>}
      />

      {saved && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          ✓ {saved}
        </p>
      )}

      {pendingReview.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 text-lg font-semibold">
            Awaiting your approval <span className="ml-1 rounded-full bg-foreground/10 px-2 py-0.5 align-middle text-xs">{pendingReview.length}</span>
          </h2>
          <p className="mb-3 text-sm text-muted">Paid by managers from fee cash they collected. Approved ones count as school expenses.</p>
          <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Manager</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3"><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody>
                {pendingReview.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{e.addedBy.name}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(e.expenseDate)}</td>
                    <td className="px-4 py-3">
                      {e.title}
                      {e.notes && <span className="block text-xs text-muted">{e.notes}</span>}
                    </td>
                    <td className="px-4 py-3">{e.category ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{formatRs(e.amount)}</td>
                    <td className="px-4 py-3">
                      <ReviewButtons id={e.id} label={`${e.title} (${formatRs(e.amount)}) from ${e.addedBy.name}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={filtered ? "Filtered total" : "All expenses"}
          value={formatRs(filteredSum._sum.amount ?? 0)}
          hint={`${n} expense${n === 1 ? "" : "s"}${filtered ? " matching filters" : ""}`}
        />
        <StatCard label="This month" value={formatRs(month._sum.amount ?? 0)} hint="Always shown, ignores filters" />
        <StatCard label="This year" value={formatRs(year._sum.amount ?? 0)} hint="Always shown, ignores filters" />
      </div>

      <UrlFilters
        presets={datePresets()}
        fields={[
          { name: "from", label: "From", type: "date" },
          { name: "to", label: "To", type: "date" },
          {
            name: "category",
            label: "Category",
            type: "select",
            allLabel: "All categories",
            options: EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c })),
          },
        ]}
      />

      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Added by</th>
              <th className="px-4 py-3 font-medium">Approved by</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{formatDate(e.expenseDate)}</td>
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">{e.category ?? <span className="text-muted">—</span>}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatRs(e.amount)}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  {e.addedBy.name}
                  {e.addedBy.role === "MANAGER" && <span className="block text-xs text-muted">Manager</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {e.reviewedBy ? (
                    <>
                      <span className="font-medium">{e.reviewedBy.name}</span>
                      {e.reviewedAt && <span className="block text-xs text-muted">{formatDate(e.reviewedAt)}</span>}
                    </>
                  ) : (
                    <span className="text-xs text-muted">Admin entry</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{e.notes ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link href={`/admin/expenses/${e.id}/edit`} className="mr-4 text-sm text-accent hover:underline">Edit</Link>
                  <DeleteExpenseButton id={e.id} label={`${e.title} (${formatRs(e.amount)})`} />
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-muted">{filtered ? "No expenses match these filters." : "No expenses yet."}</td></tr>
            )}
          </tbody>
          {expenses.length > 0 && (
            <tfoot className="border-t border-border">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right font-medium">Total</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{formatRs(filteredSum._sum.amount ?? 0)}</td>
                <td colSpan={4} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
