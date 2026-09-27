"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMonth, formatRs } from "@/lib/format";
import { inputClass, primaryButtonClass } from "@/components/ui";

export type PayableStudent = {
  id: string;
  name: string;
  fatherName: string;
  className: string;
  due: number;
  left: boolean;
  monthlyFee: number;
  admissionFee: number | null;
};

type FeeType = "MONTHLY" | "ADMISSION";
type Fields = Partial<Record<"studentId" | "feeType" | "forMonth" | "amount" | "notes", string>>;

const MAX_RESULTS = 8;

export default function RecordPaymentForm({ students, currentMonth }: { students: PayableStudent[]; currentMonth: string }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<PayableStudent | null>(null);
  const [feeType, setFeeType] = useState<FeeType>("MONTHLY");
  const [forMonth, setForMonth] = useState(currentMonth); // kept between entries — batches are usually one month
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter(
        (s) => s.name.toLowerCase().includes(q) || s.fatherName.toLowerCase().includes(q) || s.className.toLowerCase().includes(q)
      )
      .slice(0, MAX_RESULTS);
  }, [students, query]);

  function defaultAmount(s: PayableStudent, type: FeeType) {
    const fee = type === "MONTHLY" ? s.monthlyFee : s.admissionFee;
    return fee ? String(fee) : "";
  }

  function pick(s: PayableStudent) {
    setSelected(s);
    setQuery("");
    setFields({});
    setError(null);
    setAmount(defaultAmount(s, feeType));
    // Focus the amount so the manager can confirm or type over it and hit Enter.
    requestAnimationFrame(() => amountRef.current?.select());
  }

  function changeFeeType(t: FeeType) {
    setFeeType(t);
    if (selected) setAmount(defaultAmount(selected, t));
  }

  function clearStudent() {
    setSelected(null);
    setAmount("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(matches[Math.min(active, matches.length - 1)]);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!selected) {
      setFields({ studentId: "Select a student." });
      searchRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    setFields({});
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selected.id,
          feeType,
          forMonth: feeType === "MONTHLY" ? forMonth : undefined,
          amount,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the payment.");
        setFields(data.fields ?? {});
        return;
      }
      const what = feeType === "MONTHLY" ? `Monthly · ${formatMonth(forMonth)}` : "Admission";
      setLastSaved(`Recorded ${formatRs(data.payment.amount)} from ${data.student.name} (${what}).`);
      // Clear for the next entry; keep fee type + month.
      setSelected(null);
      setAmount("");
      setNotes("");
      router.refresh();
      requestAnimationFrame(() => searchRef.current?.focus());
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const errText = (k: keyof Fields) =>
    fields[k] ? <p className="text-xs text-warn">{fields[k]}</p> : null;

  const segment = (t: FeeType, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={feeType === t}
      onClick={() => changeFeeType(t)}
      className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
        feeType === t ? "bg-accent-strong text-accent-fg" : "hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-5 md:p-6">
      {lastSaved && (
        <p role="status" className="flex items-start justify-between gap-3 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          <span>✓ {lastSaved}</span>
          <button type="button" onClick={() => setLastSaved(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">×</button>
        </p>
      )}

      {/* Student */}
      <div className="space-y-1">
        <label htmlFor="student-search" className="text-sm font-medium">Student</label>
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-accent bg-accent-soft px-3 py-2 ">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">
                {selected.name}
                {selected.left && <span className="ml-2 text-xs text-muted">(left school)</span>}
              </p>
              <p className="truncate text-xs text-muted">
                {selected.className} · s/o {selected.fatherName} ·{" "}
                <span className={selected.due > 0 ? "font-medium text-warn" : ""}>
                  {selected.due > 0 ? `${formatRs(selected.due)} due` : selected.due < 0 ? `${formatRs(-selected.due)} in advance` : "Paid up"}
                </span>
              </p>
            </div>
            <button type="button" onClick={clearStudent} className="shrink-0 text-sm text-accent hover:underline">
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              ref={searchRef}
              id="student-search"
              type="search"
              autoFocus
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder="Type a name, father's name or class…"
              role="combobox"
              aria-expanded={matches.length > 0}
              aria-controls="student-results"
              aria-activedescendant={matches[active] ? `opt-${matches[active].id}` : undefined}
              className={`${inputClass} ${fields.studentId ? "border-warn" : ""}`}
            />
            {query.trim() && (
              <ul id="student-results" role="listbox" className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-border bg-surface shadow-lg">
                {matches.length === 0 && <li className="px-3 py-3 text-sm text-muted">No student matches “{query}”.</li>}
                {matches.map((s, i) => (
                  <li
                    key={s.id}
                    id={`opt-${s.id}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(s);
                    }}
                    onMouseEnter={() => setActive(i)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${i === active ? "bg-accent-strong text-accent-fg" : ""}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{s.name}{s.left && " (left)"}</span>
                      <span className={`block truncate text-xs ${i === active ? "text-accent-fg/80" : "text-muted"}`}>
                        {s.className} · s/o {s.fatherName}
                      </span>
                    </span>
                    <span className={`whitespace-nowrap text-xs tabular-nums ${i === active ? "text-accent-fg/90" : s.due > 0 ? "text-warn" : "text-muted"}`}>
                      {s.due > 0 ? `${formatRs(s.due)} due` : "Paid up"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {errText("studentId")}
      </div>

      {/* Fee type + month */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <span id="fee-type-label" className="text-sm font-medium">Fee type</span>
          <div role="radiogroup" aria-labelledby="fee-type-label" className="flex gap-1 rounded-lg border border-border p-1">
            {segment("MONTHLY", "Monthly")}
            {segment("ADMISSION", "Admission")}
          </div>
          {errText("feeType")}
        </div>
        {feeType === "MONTHLY" && (
          <div className="space-y-1">
            <label htmlFor="for-month" className="text-sm font-medium">For month</label>
            <input
              id="for-month"
              type="month"
              value={forMonth}
              onChange={(e) => setForMonth(e.target.value)}
              className={`${inputClass} ${fields.forMonth ? "border-warn" : ""}`}
            />
            {errText("forMonth")}
          </div>
        )}
      </div>

      {/* Amount + notes */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium">Amount (Rs)</label>
          <input
            ref={amountRef}
            id="amount"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 2000"
            className={`${inputClass} text-lg font-semibold tabular-nums ${fields.amount ? "border-warn" : ""}`}
          />
          {errText("amount") ?? (
            <p className="text-xs text-muted">
              {selected
                ? feeType === "MONTHLY"
                  ? `Monthly fee is ${formatRs(selected.monthlyFee)}. Change it for a partial payment.`
                  : selected.admissionFee
                    ? `Admission fee is ${formatRs(selected.admissionFee)}.`
                    : "This student has no admission fee set."
                : "Filled in automatically when you pick a student."}
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
            placeholder="e.g. partial payment"
            className={`${inputClass} ${fields.notes ? "border-warn" : ""}`}
          />
          {errText("notes")}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5 sm:w-auto`}>
        {saving ? "Saving…" : "Save payment"}
      </button>
    </form>
  );
}
