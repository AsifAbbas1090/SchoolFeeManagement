"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { inputClass } from "@/components/ui";

export type FilterField =
  | { name: string; label: string; type: "date" }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; allLabel: string };

export type FilterPreset = { label: string; values: Record<string, string> };

// Filter row whose state lives in the URL (?from=…&to=…&manager=…). Every change updates the URL,
// the server component re-renders with the filtered data — so views are live, bookmarkable and shareable.
export default function UrlFilters({ fields, presets = [] }: { fields: FilterField[]; presets?: FilterPreset[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.delete("saved"); // drop one-off flash messages when filtering
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  const active = fields.some((f) => params.get(f.name));

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-4" aria-busy={pending}>
      <div className="flex flex-wrap items-end gap-3">
        {fields.map((f) => (
          <div key={f.name} className="min-w-[9.5rem] flex-1 space-y-1 sm:flex-none">
            <label htmlFor={`f-${f.name}`} className="text-xs font-medium text-muted">{f.label}</label>
            {f.type === "date" ? (
              <input
                id={`f-${f.name}`}
                type="date"
                value={params.get(f.name) ?? ""}
                onChange={(e) => apply({ [f.name]: e.target.value })}
                className={inputClass}
              />
            ) : (
              <select
                id={`f-${f.name}`}
                value={params.get(f.name) ?? ""}
                onChange={(e) => apply({ [f.name]: e.target.value })}
                className={`${inputClass} sm:w-52`}
              >
                <option value="">{f.allLabel}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(p.values)}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
          {active && (
            <button
              type="button"
              onClick={() => apply(Object.fromEntries(fields.map((f) => [f.name, ""])))}
              className="h-9 px-2 text-sm text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
          {pending && <span className="text-xs text-muted" role="status">Updating…</span>}
        </div>
      </div>
    </div>
  );
}
