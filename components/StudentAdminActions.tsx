"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Admin-only buttons on the student detail page. There is intentionally NO delete:
// removing a student would orphan their payment history.
export default function StudentAdminActions({
  studentId,
  studentName,
  status,
}: {
  studentId: string;
  studentName: string;
  status: "ACTIVE" | "LEFT";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: "ACTIVE" | "LEFT") {
    const msg =
      next === "LEFT"
        ? `Are you sure you want to mark ${studentName} as left?\n\nThey'll be hidden from the student list and stop being billed monthly. Their payment history is kept.`
        : `Mark ${studentName} as active again? Monthly billing resumes from their admission date.`;
    if (!window.confirm(msg)) return;

    setBusy(true);
    const res = await fetch(`/api/admin/students/${studentId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not update the student.");
      return;
    }
    router.refresh();
  }

  const btn = "inline-flex h-9 items-center rounded-md border px-3 text-sm disabled:opacity-60";

  return (
    <div className="flex gap-2">
      <Link href={`/admin/students/${studentId}/edit`} className={`${btn} border-border hover:bg-black/5 dark:hover:bg-white/10`}>
        Edit
      </Link>
      {status === "ACTIVE" ? (
        <button
          onClick={() => setStatus("LEFT")}
          disabled={busy}
          className={`${btn} border-warn/40 text-warn hover:bg-warn-soft`}
        >
          {busy ? "Saving…" : "Mark as Left"}
        </button>
      ) : (
        <button onClick={() => setStatus("ACTIVE")} disabled={busy} className={`${btn} border-border hover:bg-black/5 dark:hover:bg-white/10`}>
          {busy ? "Saving…" : "Mark as Active"}
        </button>
      )}
    </div>
  );
}
