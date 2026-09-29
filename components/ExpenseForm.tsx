"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES } from "@/lib/expenseInput";
import { inputClass, primaryButtonClass } from "@/components/ui";
import MoneyInput from "@/components/MoneyInput";

type Values = { title: string; category: string; amount: string; expenseDate: string; notes: string };
type FieldErrors = Partial<Record<keyof Values, string>>;

// Shared by Admin add/edit and the manager's "record an expense" form.
export default function ExpenseForm({
  initial,
  action,
  method,
  submitLabel,
  redirectTo,
}: {
  initial: Values;
  action: string;
  method: "POST" | "PATCH";
  submitLabel: string;
  redirectTo: string; // list page to return to, e.g. "/admin/expenses"
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch(action, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        setFields(data.fields ?? {});
        setSaving(false);
        return;
      }
      router.push(`${redirectTo}?saved=${method === "POST" ? "added" : "updated"}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection.");
      setSaving(false);
    }
  }

  const msg = (k: keyof Values, help?: string) => (
    <p id={`${k}-msg`} className={`min-h-4 text-xs ${fields[k] ? "text-warn" : "text-muted"}`}>
      {fields[k] ?? help}
    </p>
  );
  const cls = (k: keyof Values) => `${inputClass} ${fields[k] ? "border-warn" : ""}`;

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-2xl space-y-2 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-6">
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <label htmlFor="title" className="text-sm font-medium">Title</label>
          <input id="title" name="title" defaultValue={initial.title} required autoComplete="off" placeholder="e.g. Electricity bill" className={cls("title")} aria-describedby="title-msg" />
          {msg("title")}
        </div>
        <div className="space-y-1">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select id="category" name="category" defaultValue={initial.category} className={cls("category")} aria-describedby="category-msg">
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {msg("category")}
        </div>
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium">Amount (Rs)</label>
          <MoneyInput id="amount" name="amount" defaultValue={initial.amount} required className={cls("amount")} aria-describedby="amount-msg" />
          {msg("amount", "Whole rupees.")}
        </div>
        <div className="space-y-1">
          <label htmlFor="expenseDate" className="text-sm font-medium">Date</label>
          <input id="expenseDate" name="expenseDate" type="date" defaultValue={initial.expenseDate} required className={cls("expenseDate")} aria-describedby="expenseDate-msg" />
          {msg("expenseDate")}
        </div>
        <div className="space-y-1">
          <label htmlFor="notes" className="text-sm font-medium">Notes (optional)</label>
          <input id="notes" name="notes" defaultValue={initial.notes} maxLength={200} autoComplete="off" className={cls("notes")} aria-describedby="notes-msg" />
          {msg("notes")}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>
      )}
      <div className="pt-2">
        <button type="submit" disabled={saving} className={primaryButtonClass}>{saving ? "Saving…" : submitLabel}</button>
      </div>
    </form>
  );
}
