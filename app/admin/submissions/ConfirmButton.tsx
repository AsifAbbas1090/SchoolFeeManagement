"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!window.confirm(`Confirm you have counted and received ${label}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/submissions/${id}/confirm`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Could not confirm.");
    }
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={confirm}
      disabled={busy}
      className="rounded-md bg-accent-strong px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-strong/90 disabled:opacity-60"
    >
      {busy ? "Confirming…" : "Confirm"}
    </button>
  );
}
