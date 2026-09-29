import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ConfirmButton from "./ConfirmButton";

export const metadata = { title: "Submissions · Admin" };
export const dynamic = "force-dynamic";

const include = {
  submittedBy: { select: { name: true, username: true } },
  confirmedBy: { select: { name: true } },
} as const;

export default async function SubmissionsPage() {
  const actor = await requireRole("ADMIN");
  const c = { campusId: actor.campusId };
  const [pending, confirmed] = await Promise.all([
    prisma.submission.findMany({ where: { ...c, status: "PENDING" }, orderBy: { submissionDate: "asc" }, include }),
    prisma.submission.findMany({ where: { ...c, status: "CONFIRMED" }, orderBy: { confirmedAt: "desc" }, take: 50, include }),
  ]);
  const pendingTotal = pending.reduce((s, x) => s + x.amount, 0);

  const th = "px-4 py-3 font-medium";
  return (
    <>
      <PageHeader title="Submissions" subtitle="Cash handed over by managers. Confirm each one once you've counted it." />

      <section className="mb-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Pending</h2>
          <p className="text-sm">
            {pending.length} waiting · <span className="font-semibold tabular-nums">{formatRs(pendingTotal)}</span>
          </p>
        </div>
        <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr><th className={th}>Manager</th><th className={`${th} text-right`}>Amount</th><th className={th}>Submitted</th><th className={th}>Notes</th><th className={th}></th></tr>
            </thead>
            <tbody>
              {pending.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.submittedBy.name}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{formatRs(s.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(s.submissionDate)}</td>
                  <td className="px-4 py-3 text-muted">{s.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <ConfirmButton id={s.id} label={`${formatRs(s.amount)} from ${s.submittedBy.name}`} />
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">Nothing waiting — all submissions are confirmed.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-muted">Confirmed <span className="font-normal">(latest 50)</span></h2>
        <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr><th className={th}>Manager</th><th className={`${th} text-right`}>Amount</th><th className={th}>Submitted</th><th className={th}>Confirmed</th><th className={th}>Notes</th></tr>
            </thead>
            <tbody>
              {confirmed.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 text-muted">
                  <td className="px-4 py-2.5 text-foreground">{s.submittedBy.name}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">{formatRs(s.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(s.submissionDate)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">
                    {s.confirmedAt ? formatDateTime(s.confirmedAt) : "—"}
                    {s.confirmedBy && ` · ${s.confirmedBy.name}`}
                  </td>
                  <td className="px-4 py-2.5">{s.notes ?? "—"}</td>
                </tr>
              ))}
              {confirmed.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center">None confirmed yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
