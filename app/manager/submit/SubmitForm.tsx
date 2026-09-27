"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRs } from "@/lib/format";
import { inputClass, primaryButtonClass } from "@/components/ui";

export default function SubmitForm({ inHand }: { inHand: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/manager/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        setFields(data.fields ?? {});
        return;
      }
      setSaved(`Submitted ${formatRs(data.submission.amount)} — waiting for Admin to confirm.`);
      setAmount("");
      setNotes("");
      router.refresh(); // totals + history above/below update
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-5 md:p-6">
      {saved && (
        <p role="status" className="rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          ✓ {saved}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium">Amount handed over (Rs)</label>
          <input
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={inHand > 0 ? String(inHand) : "0"}
            className={`${inputClass} text-lg font-semibold tabular-nums ${fields.amount ? "border-warn" : ""}`}
          />
          {fields.amount ? (
            <p className="text-xs text-warn">{fields.amount}</p>
          ) : (
            <p className="text-xs text-muted">
              You have {formatRs(inHand)} in hand.{" "}
              {inHand > 0 && (
                <button type="button" onClick={() => setAmount(String(inHand))} className="text-accent hover:underline">
                  Submit all
                </button>
              )}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">Notes (optional)</label>
          <input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={200}
            placeholder="e.g. week 1 collections"
            className={`${inputClass} ${fields.notes ? "border-warn" : ""}`}
          />
          {fields.notes && <p className="text-xs text-warn">{fields.notes}</p>}
        </div>
      </div>
      {error && !fields.amount && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>
      )}
      <button type="submit" disabled={saving || inHand <= 0} className={primaryButtonClass}>
        {saving ? "Submitting…" : "Submit to Admin"}
      </button>
    </form>
  );
}
