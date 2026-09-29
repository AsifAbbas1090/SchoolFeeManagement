"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMonth, formatRs } from "@/lib/format";
import { inputClass, primaryButtonClass } from "@/components/ui";
import MoneyInput from "@/components/MoneyInput";

export default function PaperFundForm({ defaultMonth, rates }: { defaultMonth: string; rates: Record<string, number> }) {
  const router = useRouter();
  const [forMonth, setForMonth] = useState(defaultMonth);
  const [amount, setAmount] = useState(rates[defaultMonth] !== undefined ? String(rates[defaultMonth]) : "");
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const existing = rates[forMonth];

  function changeMonth(m: string) {
    setForMonth(m);
    setAmount(rates[m] !== undefined ? String(rates[m]) : "");
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (existing !== undefined && Number(amount) !== existing) {
      const ok = window.confirm(
        `Change Paper Fund for ${formatMonth(forMonth)} from ${formatRs(existing)} to ${formatRs(Number(amount) || 0)}?\n\nEvery billed student's PF due for that month changes too.`
      );
      if (!ok) return;
    }
    setSaving(true);
    setFields({});
    setMsg(null);
    try {
      const res = await fetch("/api/admin/paper-fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forMonth, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFields(data.fields ?? {});
        setMsg(data.error ?? "Could not save.");
        return;
      }
      setMsg(`✓ Paper Fund for ${formatMonth(data.charge.forMonth)} set to ${formatRs(data.charge.amount)}.`);
      router.refresh();
    } catch {
      setMsg("Could not reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-sm shadow-black/[0.03] md:p-6">
      {msg && (
        <p role="status" className={`rounded-md px-3 py-2 text-sm ${msg.startsWith("✓") ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>
          {msg}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="pf-month" className="text-sm font-medium">Month</label>
          <input
            id="pf-month"
            type="month"
            value={forMonth}
            onChange={(e) => changeMonth(e.target.value)}
            className={`${inputClass} ${fields.forMonth ? "border-warn" : ""}`}
          />
          <p className={`text-xs ${fields.forMonth ? "text-warn" : "text-muted"}`}>
            {fields.forMonth ?? (existing !== undefined ? `Currently ${formatRs(existing)} — saving changes it.` : "Not set yet for this month.")}
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="pf-amount" className="text-sm font-medium">Paper Fund per student (Rs)</label>
          <MoneyInput
            id="pf-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 150"
            className={`${inputClass} text-lg font-semibold tabular-nums ${fields.amount ? "border-warn" : ""}`}
          />
          <p className={`text-xs ${fields.amount ? "text-warn" : "text-muted"}`}>
            {fields.amount ?? "Same amount for every student in this campus. 0 = no Paper Fund this month."}
          </p>
        </div>
      </div>
      <button type="submit" disabled={saving} className={primaryButtonClass}>
        {saving ? "Saving…" : existing !== undefined ? "Update Paper Fund" : "Set Paper Fund"}
      </button>
    </form>
  );
}
