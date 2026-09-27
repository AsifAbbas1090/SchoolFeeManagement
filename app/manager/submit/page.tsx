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
  const [t, history] = await Promise.all([
    getManagerTotals(session.sub),
    prisma.submission.findMany({
      where: { submittedById: session.sub },
      orderBy: { submissionDate: "desc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <PageHeader title="Submit to Admin" subtitle="Record cash you're handing over. Admin confirms it once counted." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Cash in Hand" value={formatRs(t.inHand)} hint="Collected − submitted" />
        <StatCard label="Total Submitted" value={formatRs(t.submitted)} hint={`${formatRs(t.submittedConfirmed)} confirmed`} />
        <StatCard label="Awaiting Confirmation" value={formatRs(t.submittedPending)} />
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
                  {s.confirmedAt && <span className="ml-2 text-xs text-muted">{formatDateTime(s.confirmedAt)}</span>}
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
