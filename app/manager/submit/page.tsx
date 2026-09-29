import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getManagerTotals } from "@/lib/stats";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui";
import StatusBadge from "@/components/StatusBadge";
import SubmitForm from "./SubmitForm";

export const metadata = { title: "Submit to Admin · Management" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  const session = await requireRole("MANAGER");
  const [t, history, pf] = await Promise.all([
    getManagerTotals(session.sub),
    prisma.submission.findMany({
      where: { submittedById: session.sub },
      orderBy: { submissionDate: "desc" },
      take: 50,
      include: { confirmedBy: { select: { name: true } } },
    }),
    // Paper Fund is cash like any fee: it's already inside "collected" and handed over with submissions.
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { collectedById: session.sub, feeType: "PAPER_FUND" } }),
  ]);
  const pfCollected = pf._sum.amount ?? 0;

  return (
    <>
      <PageHeader title="Submit to Admin" subtitle="Record cash you're handing over. Admin confirms it once counted." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cash in Hand" value={formatRs(t.inHand)} hint="Collected − submitted − expenses" />
        <StatCard label="Total Submitted" value={formatRs(t.submitted)} hint={`${formatRs(t.submittedConfirmed)} confirmed`} />
        <StatCard label="Awaiting Confirmation" value={formatRs(t.submittedPending)} />
      </div>

      {/* Where "cash in hand" comes from — earlier days' leftover is always included. */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm shadow-black/[0.03]">
        <p className="mb-2 font-medium">How your cash in hand adds up</p>
        <dl className="grid max-w-md grid-cols-[1fr_auto] gap-x-6 gap-y-1 tabular-nums">
          <dt className="text-muted">Carried over from earlier days</dt><dd className="text-right">{formatRs(t.carriedOver)}</dd>
          <dt className="text-muted">+ Collected today</dt><dd className="text-right">{formatRs(t.today)}</dd>
          <dt className="text-muted">− Submitted today</dt><dd className="text-right">{formatRs(t.submittedToday)}</dd>
          <dt className="text-muted">− Expenses recorded today</dt><dd className="text-right">{formatRs(t.spentToday)}</dd>
          <dt className="border-t border-border pt-1 font-semibold">= Cash in hand (you can submit up to this)</dt>
          <dd className="border-t border-border pt-1 text-right font-semibold">{formatRs(t.inHand)}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted">
          Includes Paper Fund: you have collected {formatRs(pfCollected)} of Paper Fund in total. It is handed over in the same
          submissions as fees — no separate step.
        </p>
      </div>

      <SubmitForm inHand={t.inHand} />

      <h2 className="mb-3 mt-8 text-lg font-semibold">Your submissions</h2>
      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {history.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{formatDateTime(s.submissionDate)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatRs(s.amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} />
                  {s.confirmedAt && (
                    <span className="ml-2 text-xs text-muted">
                      by <span className="font-medium text-foreground">{s.confirmedBy?.name ?? "Admin"}</span> · {formatDateTime(s.confirmedAt)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{s.notes ?? "—"}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted">No submissions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
