// Time-bucketed collection totals (pure — no DB). Buckets are school-time days / weeks / months.
import { addDaysKey, addMonthsKey, dayKey, monthKey, weekStartKey } from "@/lib/time";
import { formatMonth } from "@/lib/format";

export type Bucket = { key: string; label: string; total: number; count: number };
export type BucketKind = "day" | "week" | "month";

type Payment = { amount: number; paymentDate: Date };

const dayLabel = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
};

// Oldest → newest, `count` buckets ending with the current day / week / month. Empty buckets are
// included (as 0) so gaps in collection are visible, not skipped.
export function bucketize(payments: Payment[], kind: BucketKind, count: number, now: Date = new Date()): Bucket[] {
  const today = dayKey(now);
  const keyOf = (d: Date) => (kind === "day" ? dayKey(d) : kind === "week" ? weekStartKey(dayKey(d)) : monthKey(d));
  const lastKey = kind === "day" ? today : kind === "week" ? weekStartKey(today) : monthKey(now);
  const step = (k: string, n: number) => (kind === "month" ? addMonthsKey(k, n) : addDaysKey(k, kind === "week" ? n * 7 : n));

  const buckets: Bucket[] = [];
  const index = new Map<string, Bucket>();
  for (let i = count - 1; i >= 0; i--) {
    const key = step(lastKey, -i);
    const label = kind === "month" ? formatMonth(key) : kind === "week" ? `w/c ${dayLabel(key)}` : dayLabel(key);
    const b = { key, label, total: 0, count: 0 };
    buckets.push(b);
    index.set(key, b);
  }
  for (const p of payments) {
    const b = index.get(keyOf(p.paymentDate));
    if (b) {
      b.total += p.amount;
      b.count += 1;
    }
  }
  return buckets;
}

// Earliest date any bucket view needs (12 months back covers 12 weeks and 30 days too).
export function bucketWindowStart(now: Date = new Date()): string {
  return `${addMonthsKey(monthKey(now), -11)}-01`;
}
