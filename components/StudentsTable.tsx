"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StudentRow } from "@/lib/students";
import { formatRs } from "@/lib/format";
import { inputClass } from "@/components/ui";

// Shared by /admin/students and /manager/students. `basePath` decides where rows link to.
export default function StudentsTable({ students, basePath }: { students: StudentRow[]; basePath: string }) {
  const [query, setQuery] = useState("");
  const [showLeft, setShowLeft] = useState(false);
  const [onlyDue, setOnlyDue] = useState(false);

  const leftCount = students.filter((s) => s.status === "LEFT").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter(
      (s) =>
        (showLeft || s.status === "ACTIVE") &&
        (!onlyDue || s.due > 0) &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.className.toLowerCase().includes(q))
    );
  }, [students, query, showLeft, onlyDue]);

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
          <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent-strong))]" />
          Only with dues remaining
        </label>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm">
          <input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent-strong))]" />
          Include students who left school <span className="text-muted">({leftCount})</span>
        </label>
        <span className="ml-auto text-sm text-muted" aria-live="polite">
          {visible.length} shown
        </span>
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Father&apos;s name</th>
              <th className="px-4 py-3 font-medium">Class</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 text-right font-medium">Monthly fee</th>
              <th className="px-4 py-3 text-right font-medium">Balance due</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                <td className="px-4 py-3">
                  <Link href={`${basePath}/${s.id}`} className="font-medium text-accent hover:underline">
                    {s.name}
                  </Link>
                  {s.status === "LEFT" && (
                    <span className="ml-2 rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/80">
                      Left
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{s.fatherName}</td>
                <td className="whitespace-nowrap px-4 py-3">{s.className}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{s.phoneNumber}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatRs(s.monthlyFee)}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${s.due > 0 ? "font-medium text-warn" : "text-muted"}`}>
                  {s.due < 0 ? `${formatRs(-s.due)} adv.` : formatRs(s.due)}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  {students.length === 0
                    ? "No students yet."
                    : query
                      ? `No students match "${query}".`
                      : onlyDue
                        ? "Nobody has dues remaining."
                        : "No students to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
