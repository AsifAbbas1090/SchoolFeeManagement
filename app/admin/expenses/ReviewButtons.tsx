"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review(decision: "APPROVE" | "REJECT") {
    let note = "";
    if (decision === "APPROVE") {
      if (!window.confirm(`Approve ${label}?\n\nIt will count as a school expense.`)) return;
    } else {
      const reason = window.prompt(`Reject ${label}?\n\nThe amount goes back into the manager's cash in hand. Reason (optional):`, "");
      if (reason === null) return; // cancelled
      note = reason;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/expenses/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, note }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not review the expense.");
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <div className="flex justify-end gap-2">
      <button
        onClick={() => review("APPROVE")}
        disabled={busy}
        className="rounded-lg bg-accent-strong px-3 py-1.5 text-sm font-semibold text-accent-fg hover:bg-accent-strong/90 disabled:opacity-60"
      >
        Approve
      </button>
      <button
        onClick={() => review("REJECT")}
        disabled={busy}
        className="rounded-lg border border-warn/40 px-3 py-1.5 text-sm font-medium text-warn hover:bg-warn-soft disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}
