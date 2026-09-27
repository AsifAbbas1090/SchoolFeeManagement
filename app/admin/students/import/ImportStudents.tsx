"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { primaryButtonClass } from "@/components/ui";

type PreviewRow = { rowNumber: number; values: Record<string, string>; errors: string[]; valid: boolean };
type Preview = { rows: PreviewRow[]; validCount: number; invalidCount: number; ignoredColumns: string[]; created?: number };

const COLUMNS: [string, string][] = [
  ["name", "Name"],
  ["father_name", "Father's name"],
  ["class", "Class"],
  ["phone_number", "Phone"],
  ["monthly_fee", "Monthly fee"],
  ["admission_fee", "Admission fee"],
];

export default function ImportStudents() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [result, setResult] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);

  async function send(f: File, mode: "preview" | "commit"): Promise<Preview | null> {
    const body = new FormData();
    body.append("file", f);
    body.append("mode", mode);
    setBusy(mode);
    setError(null);
    try {
      const res = await fetch("/api/admin/students/import", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return null;
      }
      return data as Preview;
    } catch {
      setError("Could not reach the server. Check your connection.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setResult(null);
    if (f) setPreview(await send(f, "preview"));
  }

  async function onConfirm() {
    if (!file || !preview) return;
    const done = await send(file, "commit");
    if (done) {
      setResult(done);
      setPreview(null);
      router.refresh();
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (result) {
    return (
      <div role="status" className="space-y-3 rounded-lg border border-accent/30 bg-accent-soft p-5 text-sm text-foreground">
        <p className="text-base font-semibold">
          Imported {result.created} student{result.created === 1 ? "" : "s"}.
        </p>
        {result.invalidCount > 0 && <p>{result.invalidCount} row{result.invalidCount === 1 ? " was" : "s were"} skipped because of errors.</p>}
        <div className="flex gap-3">
          <Link href="/admin/students" className={primaryButtonClass}>View students</Link>
          <button onClick={reset} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            Import another file
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-border bg-surface p-5">
        <label htmlFor="import-file" className="mb-2 block text-sm font-medium">Choose spreadsheet</label>
        <input
          ref={inputRef}
          id="import-file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={onFileChange}
          disabled={busy !== null}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-strong file:px-3 file:py-2 file:text-sm file:font-medium file:text-accent-fg hover:file:bg-accent-strong/90"
        />
        {busy === "preview" && <p className="mt-2 text-sm text-muted">Checking file…</p>}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}

      {preview && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm">
              <span className="font-semibold text-accent">{preview.validCount} ready to import</span>
              {preview.invalidCount > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-warn">{preview.invalidCount} with errors (will be skipped)</span>
                </>
              )}
            </p>
            <div className="ml-auto flex gap-2">
              <button onClick={reset} disabled={busy !== null} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/10">
                Cancel
              </button>
              <button onClick={onConfirm} disabled={busy !== null || preview.validCount === 0} className={primaryButtonClass}>
                {busy === "commit" ? "Importing…" : `Confirm Import (${preview.validCount})`}
              </button>
            </div>
          </div>

          {preview.ignoredColumns.length > 0 && (
            <p className="text-xs text-muted">Ignored extra column{preview.ignoredColumns.length > 1 ? "s" : ""}: {preview.ignoredColumns.join(", ")}</p>
          )}

          <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Row</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  {COLUMNS.map(([, label]) => (
                    <th key={label} className="whitespace-nowrap px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr
                    key={r.rowNumber}
                    className={`border-b border-border align-top last:border-0 ${r.valid ? "" : "bg-warn-soft"}`}
                  >
                    <td className="px-3 py-2 tabular-nums text-muted">{r.rowNumber}</td>
                    <td className="min-w-56 px-3 py-2">
                      {r.valid ? (
                        <span className="text-accent">OK</span>
                      ) : (
                        <ul className="space-y-0.5 text-warn">
                          {r.errors.map((e) => (
                            <li key={e}>row {r.rowNumber}: {e}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    {COLUMNS.map(([key]) => (
                      <td key={key} className="whitespace-nowrap px-3 py-2">
                        {r.values[key] || <span className="text-muted">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
