// The ONE parser for rupee amounts coming from forms/APIs (students, payments, submissions,
// expenses, Paper Fund). Whole rupees only: rejects negatives, decimals, exponents ("1e3"),
// letters and anything above `max`. Commas and surrounding spaces are allowed ("2,500").
export const MAX_RUPEES = 10_000_000;

export type ParsedRupees = number | null | "invalid"; // null = left blank

export function parseRupees(v: unknown, max: number = MAX_RUPEES): ParsedRupees {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isSafeInteger(v) && v >= 0 && v <= max ? v : "invalid";
  if (typeof v !== "string") return "invalid";
  const s = v.replace(/,/g, "").trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return "invalid"; // digits only: no "-", ".", "e", "+"
  const n = Number(s);
  return n <= max ? n : "invalid";
}

// Required amount that must be at least 1 (payments, submissions, expenses).
export function parsePositiveRupees(v: unknown, max: number = MAX_RUPEES): number | "invalid" {
  const n = parseRupees(v, max);
  return typeof n === "number" && n > 0 ? n : "invalid";
}
