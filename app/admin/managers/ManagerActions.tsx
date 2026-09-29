"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRs } from "@/lib/format";

export default function ManagerActions({
  id,
  name,
  isActive,
  stillWith,
  hasRecords,
}: {
  id: string;
  name: string;
  isActive: boolean;
  stillWith: number; // cash still with this manager
  hasRecords: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function call(method: "PATCH" | "DELETE", body?: object) {
    setBusy(true);
    const res = await fetch(`/api/admin/managers/${id}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) window.alert(data.error ?? "Could not update the manager.");
    router.refresh();
  }

  function toggle() {
    if (isActive) {
      const cash = stillWith > 0 ? `\n\n⚠ ${name} still has ${formatRs(stillWith)} of collected cash. Collect it (a submission) before or after — it stays on record either way.` : "";
      if (!window.confirm(`Deactivate ${name}?\n\nThey won't be able to log in. All their payments, submissions and expenses stay in the records.${cash}`)) return;
      call("PATCH", { active: false });
    } else {
      if (!window.confirm(`Reactivate ${name}? They'll be able to log in again.`)) return;
      call("PATCH", { active: true });
    }
  }

  function remove() {
    if (!window.confirm(`Delete ${name} permanently?\n\nOnly possible because they have no records at all.`)) return;
    call("DELETE");
  }

  return (
    <div className="flex justify-end gap-3 text-sm">
      <button onClick={toggle} disabled={busy} className={`hover:underline disabled:opacity-60 ${isActive ? "text-warn" : "text-accent"}`}>
        {isActive ? "Deactivate" : "Reactivate"}
      </button>
      {!hasRecords && (
        <button onClick={remove} disabled={busy} className="text-warn hover:underline disabled:opacity-60">
          Delete
        </button>
      )}
    </div>
  );
}
