import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { addMonthsKey, monthKey } from "@/lib/time";
import { formatDateTime, formatMonth, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import PaperFundForm from "./PaperFundForm";

export const metadata = { title: "Paper Fund · Admin" };
export const dynamic = "force-dynamic";

export default async function PaperFundPage() {
  const actor = await requireRole("ADMIN");
  const c = { campusId: actor.campusId };
  const [charges, collected, activeStudents] = await Promise.all([
    prisma.monthlyCharge.findMany({
      where: { ...c, kind: "PAPER_FUND" },
      orderBy: { forMonth: "desc" },
      include: { setBy: { select: { name: true } } },
    }),
    prisma.feePayment.groupBy({ by: ["forMonth"], where: { ...c, feeType: "PAPER_FUND" }, _sum: { amount: true }, _count: true }),
    prisma.student.count({ where: { ...c, status: "ACTIVE" } }),
  ]);
  const rates = Object.fromEntries(charges.map((ch) => [ch.forMonth, ch.amount]));
  const collectedFor = new Map(collected.map((g) => [g.forMonth, g]));
  const thisMonth = monthKey();
  // Suggest this month if it isn't set yet, otherwise next month.
  const defaultMonth = rates[thisMonth] === undefined ? thisMonth : addMonthsKey(thisMonth, 1);

  return (
    <>
      <PageHeader
        title="Paper Fund"
        subtitle="Decided month by month. Once set, every student billed that month owes it (with the fee or separately)."
      />

      {rates[thisMonth] === undefined && (
        <p className="mb-4 rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm">
          Paper Fund for <strong>{formatMonth(thisMonth)}</strong> isn&apos;t set yet — no student owes PF for this month until you set it.
        </p>
      )}

      <div className="mb-8">
        <PaperFundForm defaultMonth={defaultMonth} rates={rates} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">History</h2>
      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Month</th>
              <th className="px-4 py-3 text-right font-medium">Per student</th>
              <th className="px-4 py-3 text-right font-medium">Collected for this month</th>
              <th className="px-4 py-3 font-medium">Set by</th>
            </tr>
          </thead>
          <tbody>
            {charges.map((ch) => {
              const got = collectedFor.get(ch.forMonth);
              return (
                <tr key={ch.id} className="border-b border-border last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{formatMonth(ch.forMonth)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(ch.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatRs(got?._sum.amount ?? 0)}
                    <span className="block text-xs text-muted">
                      {got?._count ?? 0} payment{got?._count === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ch.setBy.name} · {formatDateTime(ch.updatedAt)}
                  </td>
                </tr>
              );
            })}
            {charges.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">No Paper Fund set yet. {activeStudents} active students.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
