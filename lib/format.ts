import { APP_TIME_ZONE, dayKey } from "@/lib/time";

export function formatRs(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}Rs ${Math.abs(n).toLocaleString("en-US")}`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: APP_TIME_ZONE });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: APP_TIME_ZONE,
  });
}

// "2026-09" -> "Sept 2026"
export function formatMonth(ym: string | null | undefined): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym ?? "—";
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

// Date -> "YYYY-MM-DD" in school time, for <input type="date"> values.
export function toDateInput(d: Date | null | undefined): string {
  return d ? dayKey(d) : "";
}
