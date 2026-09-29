import Link from "next/link";
import type { Approval } from "@/lib/activity";
import { formatDateTime, formatRs } from "@/lib/format";
import Icon from "@/components/icons";

// Every admin of the campus sees every other admin's confirmations and expense reviews.
export default function RecentApprovals({ items }: { items: Approval[] }) {
  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Recent approvals</h2>
        <span className="text-xs text-muted">All admins of this campus</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No submissions confirmed or expenses reviewed yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((a) => {
            const rejected = a.kind === "EXPENSE_REJECTED";
            const verb =
              a.kind === "SUBMISSION_CONFIRMED" ? "confirmed receiving" : a.kind === "EXPENSE_APPROVED" ? "approved the expense of" : "rejected the expense of";
            return (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${rejected ? "bg-warn-soft text-warn" : "bg-accent-soft text-accent"}`}
                  aria-hidden="true"
                >
                  <Icon name={a.kind === "SUBMISSION_CONFIRMED" ? "send" : "receipt"} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold">{a.adminName}</span> {verb}{" "}
                    <span className="font-semibold tabular-nums">{formatRs(a.amount)}</span> {a.kind === "SUBMISSION_CONFIRMED" ? "from" : "by"}{" "}
                    <span className="font-medium">{a.managerName}</span>
                  </p>
                  <p className="truncate text-xs text-muted">
                    {formatDateTime(a.at)}
                    {a.detail && ` · ${a.detail}`}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-4 border-t border-border px-4 py-2.5 text-xs">
        <Link href="/admin/submissions" className="text-accent hover:underline">All submissions →</Link>
        <Link href="/admin/expenses" className="text-accent hover:underline">All expenses →</Link>
      </div>
    </section>
  );
}
