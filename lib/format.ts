import { APP_TIME_ZONE, dayKey } from "@/lib/time";

// Formatters are created once and reused — building a new one per call is slow on long tables.
const numberFmt = new Intl.NumberFormat("en-US");
const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE,
});
const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });

export function formatRs(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}Rs ${numberFmt.format(Math.abs(n))}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | string): string {
  return dateTimeFmt.format(new Date(d));
}

// "2026-09" -> "Sept 2026"
export function formatMonth(ym: string | null | undefined): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym ?? "—";
  const [y, m] = ym.split("-").map(Number);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 15)));
}

// Date -> "YYYY-MM-DD" in school time, for <input type="date"> values.
export function toDateInput(d: Date | null | undefined): string {
  return d ? dayKey(d) : "";
}

// "Admission", "Monthly · Sept 2026", "Paper Fund · Sept 2026"
export function feeTypeLabel(feeType: string, forMonth: string | null | undefined): string {
  if (feeType === "ADMISSION") return "Admission";
  if (feeType === "PAPER_FUND") return `Paper Fund · ${formatMonth(forMonth)}`;
  return `Monthly · ${formatMonth(forMonth)}`;
}
