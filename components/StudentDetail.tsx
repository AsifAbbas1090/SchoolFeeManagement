import Link from "next/link";
import { notFound } from "next/navigation";
import { getStudentDetail } from "@/lib/students";
import { feeTypeLabel, formatDate, formatDateTime, formatRs } from "@/lib/format";
import { PageHeader, StatCard } from "@/components/ui";
import StudentAdminActions from "@/components/StudentAdminActions";

// Shared by /admin/students/[id] and /manager/students/[id]. Admin gets Edit / Mark as Left.
export default async function StudentDetail({
  campusId,
  id,
  basePath,
  isAdmin,
  justAdded = false,
}: {
  campusId: string;
  id: string;
  basePath: string;
  isAdmin: boolean;
  justAdded?: boolean;
}) {
  const detail = await getStudentDetail(campusId, id); // another campus's student → 404
  if (!detail) notFound();
  const { student: s, balance } = detail;
  const left = s.status === "LEFT";

  const info: [string, React.ReactNode][] = [
    ["Father's name", s.fatherName],
    ["Class", s.className],
    ["Phone", s.phoneNumber],
    ["Monthly fee", formatRs(s.monthlyFee)],
    ["Admission fee", s.admissionFee === null ? <span className="text-muted">None</span> : formatRs(s.admissionFee)],
    ["Paper Fund", <span key="pf" className="text-muted">Set monthly by Admin</span>],
    ["Admission date", s.admissionDate ? formatDate(s.admissionDate) : <span className="text-muted">Not set (using {formatDate(s.createdAt)})</span>],
    ["Status", left ? `Left${s.leftAt ? ` on ${formatDate(s.leftAt)}` : ""}` : "Active"],
    ["Added by", s.createdBy.name],
  ];

  return (
    <>
      <Link href={basePath} className="mb-3 inline-block text-sm text-muted hover:text-foreground">
        ← All students
      </Link>
      <PageHeader
        title={s.name}
        subtitle={`${s.className} · s/o ${s.fatherName}`}
        action={isAdmin ? <StudentAdminActions studentId={s.id} studentName={s.name} status={s.status} paymentCount={s.feePayments.length} /> : undefined}
      />

      {justAdded && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          ✓ {s.name} added. You can record their first payment now.
        </p>
      )}

      {left && (
        <p className="mb-4 rounded-md border border-border bg-foreground/5 px-3 py-2 text-sm ">
          This student has left. Their record and payment history are kept; monthly fees and Paper Fund stopped accruing after {formatDate(s.leftAt)}.
        </p>
      )}

      <dl className="mb-6 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {info.map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={balance.tuition.due < 0 ? "Tuition paid in advance" : "Tuition due"}
          value={formatRs(Math.abs(balance.tuition.due))}
          tone={balance.tuition.due > 0 ? "warn" : "default"}
          hint={`Owed ${formatRs(balance.tuition.owed)} (${formatRs(s.admissionFee ?? 0)} admission + ${formatRs(s.monthlyFee)} × ${balance.months} mo) · paid ${formatRs(balance.tuition.paid)}`}
        />
        <StatCard
          label={balance.paperFund.due < 0 ? "Paper Fund paid in advance" : "PF due"}
          value={formatRs(Math.abs(balance.paperFund.due))}
          tone={balance.paperFund.due > 0 ? "warn" : "default"}
          hint={`Owed ${formatRs(balance.paperFund.owed)} · paid ${formatRs(balance.paperFund.paid)}${balance.paperFund.monthsNotSet > 0 ? ` · ${balance.paperFund.monthsNotSet} month${balance.paperFund.monthsNotSet === 1 ? "" : "s"} not set yet` : ""}`}
        />
        <StatCard
          label={balance.due < 0 ? "Total paid in advance" : "Total due"}
          value={formatRs(Math.abs(balance.due))}
          tone={balance.due > 0 ? "warn" : "accent"}
          hint={balance.due === 0 ? "Fully paid up" : `${s.feePayments.length} payment${s.feePayments.length === 1 ? "" : "s"} · ${formatRs(balance.paid)} paid in total`}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Payment history</h2>
      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Fee type</th>
              <th className="px-4 py-3 font-medium">Collected by</th>
              <th className="px-4 py-3 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {s.feePayments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{formatDateTime(p.paymentDate)}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatRs(p.amount)}</td>
                <td className="px-4 py-3">
                  {feeTypeLabel(p.feeType, p.forMonth)}
                </td>
                <td className="px-4 py-3">{p.collectedBy.name}</td>
                <td className="px-4 py-3 text-muted">{p.notes ?? "—"}</td>
              </tr>
            ))}
            {s.feePayments.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">No payments recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
