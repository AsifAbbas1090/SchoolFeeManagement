import Link from "next/link";
import { LARGE_HOLDING, OLD_HOLDING_DAYS, type Reconciliation } from "@/lib/reconciliation";
import { formatDate, formatRs } from "@/lib/format";

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
      <span aria-hidden="true">⚠</span>
      {children}
    </span>
  );
}

// Collected vs submitted vs still-with-manager. Shared by the admin dashboard and manager detail page.
export default function ReconciliationTable({ rows, linkNames = true, allTime = true }: { rows: Reconciliation[]; linkNames?: boolean; allTime?: boolean }) {
  const th = "px-4 py-3 font-medium";
  const sum = (k: "collected" | "submitted" | "spent" | "stillWith") => rows.reduce((s, r) => s + r[k], 0);

  return (
    <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
      <table className="w-full text-sm">
        <thead className="border-b border-border text-left text-muted">
          <tr>
            <th className={th}>Manager</th>
            <th className={`${th} text-right`}>Collected</th>
            <th className={`${th} text-right`}>Submitted</th>
            <th className={`${th} text-right`}>Spent</th>
            <th className={`${th} text-right`}>Still with them</th>
            <th className={th}>{allTime ? "Holding since" : ""}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const flagged = r.flagLarge || r.flagOld;
            return (
              <tr key={r.managerId} className={`border-b border-border last:border-0 ${flagged ? "bg-warn-soft/60" : ""}`}>
                <td className="px-4 py-3 font-medium">
                  {linkNames ? (
                    <Link href={`/admin/managers/${r.managerId}`} className="text-accent hover:underline">{r.name}</Link>
                  ) : (
                    r.name
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(r.collected)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatRs(r.submitted)}
                  {r.pending > 0 && <span className="block text-xs text-muted">{formatRs(r.pending)} awaiting your confirmation</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatRs(r.spent)}
                  {r.spentPending > 0 && <span className="block text-xs text-muted">{formatRs(r.spentPending)} awaiting approval</span>}
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums ${flagged ? "text-warn" : ""}`}>
                  {formatRs(r.stillWith)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allTime && r.holdingSince && (
                      <span className="whitespace-nowrap text-xs text-muted">
                        {formatDate(r.holdingSince)} ({r.daysHeld === 0 ? "today" : `${r.daysHeld} day${r.daysHeld === 1 ? "" : "s"}`})
                      </span>
                    )}
                    {r.flagLarge && <Flag>Large amount</Flag>}
                    {r.flagOld && <Flag>Held {r.daysHeld}+ days</Flag>}
                    {allTime && r.stillWith === 0 && r.collected > 0 && <span className="text-xs text-accent">✓ All handed over</span>}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No managers yet.</td></tr>
          )}
        </tbody>
        {rows.length > 1 && (
          <tfoot className="border-t-2 border-border font-semibold">
            <tr>
              <td className="px-4 py-3">All managers</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(sum("collected"))}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(sum("submitted"))}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(sum("spent"))}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(sum("stillWith"))}</td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <p className="border-t border-border px-4 py-2 text-xs text-muted">
        Flagged when {formatRs(LARGE_HOLDING)} or more is still with a manager, or any of it has been held {OLD_HOLDING_DAYS}+ days
        (oldest collections are assumed handed over first).
      </p>
    </div>
  );
}
