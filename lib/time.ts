// School-local time helpers. Every "which day / which month is it" decision goes through here,
// so the app behaves the same whether the server runs in Pakistan or on UTC (e.g. Vercel).

export const APP_TIME_ZONE = "Asia/Karachi";

export type YearMonth = { year: number; month: number }; // month: 1–12

export function yearMonthInTz(d: Date, timeZone = APP_TIME_ZONE): YearMonth {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month") };
}

// Date -> "YYYY-MM" in school time (the format stored in FeePayment.forMonth).
export function monthKey(d: Date = new Date()): string {
  const { year, month } = yearMonthInTz(d);
  return `${year}-${String(month).padStart(2, "0")}`;
}

// "YYYY-MM" -> months since year 0, for comparing/offsetting month keys.
export function monthIndex(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}

// Pakistan has no daylight saving, so school time is a fixed UTC+05:00.
export const APP_UTC_OFFSET = "+05:00";

// Date -> "YYYY-MM-DD" in school time.
export function dayKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

// Midnight (school time) at the start of the given "YYYY-MM-DD" day.
export function startOfDay(key: string = dayKey()): Date {
  return new Date(`${key}T00:00:00${APP_UTC_OFFSET}`);
}

// Midnight (school time) on the 1st of the given "YYYY-MM" month.
export function startOfMonth(key: string = monthKey()): Date {
  return new Date(`${key}-01T00:00:00${APP_UTC_OFFSET}`);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const utcKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const keyToUtc = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

// "YYYY-MM-DD" ± n days (calendar arithmetic, no time-zone drift).
export function addDaysKey(key: string, n: number): string {
  return utcKey(keyToUtc(key) + n * 86_400_000);
}

// "YYYY-MM" ± n months.
export function addMonthsKey(key: string, n: number): string {
  const i = monthIndex(key) + n;
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

// Monday of the week containing the given "YYYY-MM-DD" day.
export function weekStartKey(key: string): string {
  const dow = new Date(keyToUtc(key)).getUTCDay(); // 0 = Sunday
  return addDaysKey(key, -((dow + 6) % 7));
}

export function isDayKey(v: unknown): v is string {
  return typeof v === "string" && DAY_RE.test(v) && !Number.isNaN(Date.parse(v));
}

export type DateRange = { fromKey?: string; toKey?: string; gte?: Date; lt?: Date };

// URL ?from=YYYY-MM-DD&to=YYYY-MM-DD -> inclusive day range in school time
// (gte = start of `from`, lt = start of the day AFTER `to`). Invalid values are ignored.
export function parseDateRange(from?: string, to?: string): DateRange {
  const r: DateRange = {};
  if (isDayKey(from)) {
    r.fromKey = from;
    r.gte = startOfDay(from);
  }
  if (isDayKey(to)) {
    r.toKey = to;
    r.lt = startOfDay(addDaysKey(to, 1));
  }
  return r;
}

export function rangeWhere(r: DateRange): { gte?: Date; lt?: Date } | undefined {
  return r.gte || r.lt ? { ...(r.gte && { gte: r.gte }), ...(r.lt && { lt: r.lt }) } : undefined;
}

// Whole calendar days (school time) from day `a` to day `b`: 27 Sept 23:50 → 28 Sept 00:10 = 1.
export function calendarDaysBetween(a: Date, b: Date): number {
  return Math.round((keyToUtc(dayKey(b)) - keyToUtc(dayKey(a))) / 86_400_000);
}

// Same stretch of last month as "this month so far": 1st → today's day-of-month (clamped to month end),
// so a mid-month comparison is fair. Returns [gte, lt).
export function lastMonthToDate(now: Date = new Date()): [Date, Date] {
  const prev = addMonthsKey(monthKey(now), -1);
  const lastDayPrev = Number(addDaysKey(`${monthKey(now)}-01`, -1).slice(8));
  const day = Math.min(Number(dayKey(now).slice(8)), lastDayPrev);
  return [startOfMonth(prev), startOfDay(addDaysKey(`${prev}-${String(day).padStart(2, "0")}`, 1))];
}

// "Monday, 28 September 2026" in school time.
export function longToday(now: Date = new Date()): string {
  return now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: APP_TIME_ZONE });
}
