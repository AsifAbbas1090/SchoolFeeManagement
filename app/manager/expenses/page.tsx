import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getManagerTotals } from "@/lib/stats";
import { dayKey } from "@/lib/time";
import { formatDate, formatRs } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui";
import ExpenseForm from "@/components/ExpenseForm";
import StatusBadge from "@/components/StatusBadge";

export const metadata = { title: "Expenses · Management" };
export const dynamic = "force-dynamic";

export default async function ManagerExpensesPage({ searchParams }: { searchParams: { saved?: string } }) {
  const session = await requireRole("MANAGER");
  const [t, mine] = await Promise.all([
    getManagerTotals(session.sub),
    prisma.expense.findMany({
      where: { addedById: session.sub },
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      include: { reviewedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Expenses" subtitle="School costs you paid from collected cash. Admin approves each one." />

      {searchParams.saved === "added" && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          ✓ Expense recorded and sent to Admin for approval. It has been taken off your cash in hand.
        </p>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cash in hand" value={formatRs(t.inHand)} icon="wallet" tone="accent" hint="After submissions and expenses" />
        <StatCard label="Awaiting approval" value={formatRs(t.expensesPending)} icon="receipt" hint="Already deducted from your cash" />
        <StatCard label="Approved" value={formatRs(t.expensesApproved)} icon="receipt" />
      </div>

      <section className="mb-8">
        <h2 className="mb-1 text-lg font-semibold">Record an expense</h2>
        <p className="mb-4 text-sm text-muted">
          Only for money you paid <strong>out of fee cash you collected</strong> (e.g. chalk, repairs). If Admin rejects it, the amount
          goes back into your cash in hand.
        </p>
        <ExpenseForm
          method="POST"
          action="/api/manager/expenses"
          redirectTo="/manager/expenses"
          submitLabel="Record expense"
          initial={{ title: "", category: "Supplies", amount: "", expenseDate: dayKey(), notes: "" }}
        />
      </section>

      <h2 className="mb-3 text-lg font-semibold">Your expenses</h2>
      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{formatDate(e.expenseDate)}</td>
                <td className="px-4 py-3 font-medium">{e.title}</td>
                <td className="px-4 py-3">{e.category ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatRs(e.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={e.status} />
                  {e.reviewNote && <span className="ml-2 text-xs text-muted">“{e.reviewNote}”</span>}
                </td>
              </tr>
            ))}
            {mine.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
