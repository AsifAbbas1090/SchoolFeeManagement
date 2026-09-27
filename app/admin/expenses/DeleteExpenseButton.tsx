"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${label}"?\n\nThis permanently removes the expense and cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not delete.");
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <button onClick={remove} disabled={busy} className="text-sm text-warn hover:underline disabled:opacity-60 ">
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
