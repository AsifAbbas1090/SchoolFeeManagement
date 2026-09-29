"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { StudentRow } from "@/lib/students";
import { formatRs } from "@/lib/format";
import { inputClass } from "@/components/ui";

type Props = {
  rows: StudentRow[]; // current page only — search/filter/paging happen on the server
  basePath: string;
  total: number;
  page: number;
  pages: number;
  leftCount: number;
};

const dueCell = (n: number) => (n < 0 ? `${formatRs(-n)} adv.` : formatRs(n));

// Shared by /admin/students and /manager/students. Filters live in the URL (?q=&due=1&left=1&page=).
export default function StudentsTable({ rows, basePath, total, page, pages, leftCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const onlyDue = params.get("due") === "1";
  const showLeft = params.get("left") === "1";
  const first = useRef(true);

  function apply(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    next.delete("deleted");
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in changes)) next.delete("page"); // any filter change starts from page 1
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // Search as you type, but only ask the server once typing pauses (250 ms).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => apply({ q: query.trim() || null }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const from = total === 0 ? 0 : (page - 1) * 50 + 1;
  const to = Math.min(page * 50, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, father's name or class…"
          aria-label="Search students"
          className={`${inputClass} max-w-sm`}
        />
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyDue} onChange={(e) => apply({ due: e.target.checked ? "1" : null })} className="h-4 w-4 accent-[rgb(var(--accent-strong))]" />
          Only with dues remaining
        </label>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={showLeft} onChange={(e) => apply({ left: e.target.checked ? "1" : null })} className="h-4 w-4 accent-[rgb(var(--accent-strong))]" />
          Include students who left school <span className="text-muted">({leftCount})</span>
        </label>
        <span className="ml-auto text-sm text-muted" aria-live="polite">
          {pending ? "Loading…" : total === 0 ? "0 shown" : `${from}–${to} of ${total}`}
        </span>
      </div>

      <div className={`relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] transition-opacity ${pending ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Father&apos;s name</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 text-right font-medium">Monthly fee</th>
              <th className="px-4 py-3 text-right font-medium">Tuition due</th>
              <th className="px-4 py-3 text-right font-medium">PF due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-foreground/[0.03]">
                <td className="px-4 py-3">
                  <Link href={`${basePath}/${s.id}`} className="font-medium text-accent hover:underline">
                    {s.name}
                  </Link>
                  {s.status === "LEFT" && (
                    <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/80">Left</span>
                  )}
                </td>
                <td className="px-4 py-3">{s.fatherName}</td>
                <td className="whitespace-nowrap px-4 py-3">{s.className}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{s.phoneNumber}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(s.monthlyFee)}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${s.tuitionDue > 0 ? "font-medium text-warn" : "text-muted"}`}>
                  {dueCell(s.tuitionDue)}
                </td>
                <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${s.pfDue > 0 ? "font-medium text-warn" : "text-muted"}`}>
                  {dueCell(s.pfDue)}
                  {s.pfNotSet > 0 && s.pfDue <= 0 && <span className="block text-[11px] font-normal text-muted">PF not set yet</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  {params.get("q") ? `No students match "${params.get("q")}".` : onlyDue ? "Nobody has dues remaining." : "No students yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav className="flex items-center justify-end gap-2 text-sm" aria-label="Pages">
          <button
            disabled={page <= 1 || pending}
            onClick={() => apply({ page: String(page - 1) })}
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-foreground/5 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-muted">Page {page} of {pages}</span>
          <button
            disabled={page >= pages || pending}
            onClick={() => apply({ page: String(page + 1) })}
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-foreground/5 disabled:opacity-40"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
