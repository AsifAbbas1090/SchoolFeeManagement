"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMonth, formatRs } from "@/lib/format";
import { inputClass, primaryButtonClass } from "@/components/ui";
import MoneyInput from "@/components/MoneyInput";

export type PayableStudent = {
  id: string;
  name: string;
  fatherName: string;
  className: string;
  monthlyFee: number;
  admissionFee: number | null;
  left: boolean;
  tuitionDue: number;
  pfDue: number;
  due: number;
};

type Kind = "MONTHLY" | "PAPER_FUND" | "MONTHLY_PF" | "ADMISSION";
type Fields = Partial<Record<"studentId" | "feeType" | "forMonth" | "amount" | "pfAmount" | "notes", string>>;

const KINDS: [Kind, string][] = [
  ["MONTHLY", "Monthly"],
  ["PAPER_FUND", "Paper Fund"],
  ["MONTHLY_PF", "Monthly + PF"],
  ["ADMISSION", "Admission"],
];

const kindLabel = (k: Kind, month: string) =>
  k === "ADMISSION" ? "Admission" : k === "PAPER_FUND" ? `Paper Fund · ${formatMonth(month)}` : k === "MONTHLY_PF" ? `Monthly + Paper Fund · ${formatMonth(month)}` : `Monthly · ${formatMonth(month)}`;

export default function RecordPaymentForm({
  currentMonth,
  pfRates,
}: {
  currentMonth: string;
  pfRates: Record<string, number>; // Paper Fund amount per "YYYY-MM" for this campus (months not set are absent)
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<PayableStudent[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const pickFirstWhenReady = useRef(false); // Enter pressed while results were still loading
  const [selected, setSelected] = useState<PayableStudent | null>(null);
  const [kind, setKind] = useState<Kind>("MONTHLY");
  const [forMonth, setForMonth] = useState(currentMonth); // kept between entries — batches are usually one month
  const [amount, setAmount] = useState("");
  const [pfAmount, setPfAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Fields>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  // Search on the server as you type (debounced; a newer search cancels the older one).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setMatches([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/manager/students/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        const found: PayableStudent[] = data.students ?? [];
        setMatches(found);
        setActive(0);
        if (pickFirstWhenReady.current && found.length) {
          pickFirstWhenReady.current = false;
          pick(found[0]);
        }
      } catch {
        /* aborted or offline — keep previous results */
      } finally {
        setSearching(false);
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const pfRate = (month: string) => (pfRates[month] !== undefined ? String(pfRates[month]) : "");

  function prefill(s: PayableStudent | null, k: Kind, month: string) {
    if (!s) return;
    if (k === "MONTHLY" || k === "MONTHLY_PF") setAmount(String(s.monthlyFee));
    else if (k === "ADMISSION") setAmount(s.admissionFee ? String(s.admissionFee) : "");
    else setAmount(pfRate(month));
    setPfAmount(k === "MONTHLY_PF" ? pfRate(month) : "");
  }

  function pick(s: PayableStudent) {
    setSelected(s);
    setQuery("");
    setMatches([]);
    setFields({});
    setError(null);
    prefill(s, kind, forMonth);
    requestAnimationFrame(() => amountRef.current?.select()); // confirm or type over, then Enter
  }

  function changeKind(k: Kind) {
    setKind(k);
    prefill(selected, k, forMonth);
  }

  function changeMonth(m: string) {
    setForMonth(m);
    if (kind === "PAPER_FUND") setAmount(pfRate(m));
    if (kind === "MONTHLY_PF") setPfAmount(pfRate(m));
  }

  function clearStudent() {
    setSelected(null);
    setAmount("");
    setPfAmount("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) {
      // Fast typist: remember the Enter and pick the first match as soon as results arrive.
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        pickFirstWhenReady.current = true;
      }
      return;
    }
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
          feeType: kind,
          forMonth: kind === "ADMISSION" ? undefined : forMonth,
          amount,
          pfAmount: kind === "MONTHLY_PF" ? pfAmount : undefined,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not save the payment.");
        setFields(data.fields ?? {});
        return;
      }
      setLastSaved(`Recorded ${formatRs(data.payment.amount)} from ${data.student.name} (${kindLabel(kind, forMonth)}).`);
      // Clear for the next entry; keep fee type + month.
      setSelected(null);
      setAmount("");
      setPfAmount("");
      setNotes("");
      router.refresh();
      requestAnimationFrame(() => searchRef.current?.focus());
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  const errText = (k: keyof Fields) => (fields[k] ? <p className="text-xs text-warn">{fields[k]}</p> : null);
  const needsMonth = kind !== "ADMISSION";
  const pfNotSet = (kind === "PAPER_FUND" || kind === "MONTHLY_PF") && pfRates[forMonth] === undefined;

  const dueLine = (s: PayableStudent, onAccent = false) => {
    const parts = [
      s.tuitionDue > 0 ? `${formatRs(s.tuitionDue)} tuition` : null,
      s.pfDue > 0 ? `${formatRs(s.pfDue)} PF` : null,
    ].filter(Boolean);
    return (
      <span className={onAccent ? "" : s.due > 0 ? "font-medium text-warn" : ""}>
        {parts.length ? `${parts.join(" + ")} due` : s.due < 0 ? `${formatRs(-s.due)} in advance` : "Paid up"}
      </span>
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-sm shadow-black/[0.03] md:p-6">
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
          <div className="flex items-center justify-between gap-3 rounded-md border border-accent bg-accent-soft/50 px-3 py-2">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">
                {selected.name}
                {selected.left && <span className="ml-2 text-xs text-muted">(left school)</span>}
              </p>
              <p className="truncate text-xs text-muted">
                {selected.className} · s/o {selected.fatherName} · {dueLine(selected)}
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
                pickFirstWhenReady.current = false;
                setQuery(e.target.value);
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
                {matches.length === 0 && (
                  <li className="px-3 py-3 text-sm text-muted">{searching ? "Searching…" : `No student matches “${query}”.`}</li>
                )}
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
                    <span className="whitespace-nowrap text-xs tabular-nums">{dueLine(s, i === active)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {errText("studentId")}
      </div>

      {/* Fee type + month */}
      <div className="space-y-1">
        <span id="fee-type-label" className="text-sm font-medium">Fee type</span>
        <div role="radiogroup" aria-labelledby="fee-type-label" className="grid grid-cols-2 gap-1 rounded-lg border border-border p-1 sm:grid-cols-4">
          {KINDS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => changeKind(k)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${kind === k ? "bg-accent-strong text-accent-fg" : "hover:bg-foreground/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {errText("feeType")}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {needsMonth && (
          <div className="space-y-1">
            <label htmlFor="for-month" className="text-sm font-medium">For month</label>
            <input
              id="for-month"
              type="month"
              value={forMonth}
              onChange={(e) => changeMonth(e.target.value)}
              className={`${inputClass} ${fields.forMonth ? "border-warn" : ""}`}
            />
            {errText("forMonth") ??
              (pfNotSet && <p className="text-xs text-muted">Paper Fund for {formatMonth(forMonth)} isn&apos;t set by Admin yet — type the amount received.</p>)}
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium">
            {kind === "PAPER_FUND" ? "Paper Fund amount (Rs)" : kind === "MONTHLY_PF" ? "Monthly fee (Rs)" : "Amount (Rs)"}
          </label>
          <MoneyInput
            ref={amountRef}
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 2000"
            className={`${inputClass} text-lg font-semibold tabular-nums ${fields.amount ? "border-warn" : ""}`}
          />
          {errText("amount") ?? (
            <p className="text-xs text-muted">
              {selected
                ? kind === "ADMISSION"
                  ? selected.admissionFee ? `Admission fee is ${formatRs(selected.admissionFee)}.` : "This student has no admission fee set."
                  : kind === "PAPER_FUND"
                    ? pfRates[forMonth] !== undefined ? `Paper Fund for ${formatMonth(forMonth)} is ${formatRs(pfRates[forMonth])}.` : "Digits only."
                    : `Monthly fee is ${formatRs(selected.monthlyFee)}. Change it for a partial payment.`
                : "Filled in automatically when you pick a student."}
            </p>
          )}
        </div>
        {kind === "MONTHLY_PF" && (
          <div className="space-y-1">
            <label htmlFor="pf-amount" className="text-sm font-medium">Paper Fund (Rs)</label>
            <MoneyInput
              id="pf-amount"
              value={pfAmount}
              onChange={(e) => setPfAmount(e.target.value)}
              placeholder="e.g. 150"
              className={`${inputClass} text-lg font-semibold tabular-nums ${fields.pfAmount ? "border-warn" : ""}`}
            />
            {errText("pfAmount") ?? (
              <p className="text-xs text-muted">
                {pfRates[forMonth] !== undefined ? `Set at ${formatRs(pfRates[forMonth])} for ${formatMonth(forMonth)}.` : "Not set by Admin yet for this month."}
              </p>
            )}
          </div>
        )}
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
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className={`${primaryButtonClass} w-full py-2.5 sm:w-auto`}>
          {saving ? "Saving…" : "Save payment"}
        </button>
        {kind === "MONTHLY_PF" && (Number(amount) || 0) + (Number(pfAmount) || 0) > 0 && (
          <span className="text-sm text-muted">Total {formatRs((Number(amount) || 0) + (Number(pfAmount) || 0))}</span>
        )}
      </div>
    </form>
  );
}
