import { addDaysKey, addMonthsKey, dayKey, monthKey } from "@/lib/time";
import type { FilterPreset } from "@/components/UrlFilters";

// Common date-range shortcuts, computed in school time on the server.
export function datePresets(now: Date = new Date()): FilterPreset[] {
  const today = dayKey(now);
  const thisMonth = monthKey(now);
  const lastMonth = addMonthsKey(thisMonth, -1);
  const lastDayOf = (m: string) => addDaysKey(`${addMonthsKey(m, 1)}-01`, -1);
  return [
    { label: "This month", values: { from: `${thisMonth}-01`, to: today } },
    { label: "Last month", values: { from: `${lastMonth}-01`, to: lastDayOf(lastMonth) } },
    { label: "This year", values: { from: `${today.slice(0, 4)}-01-01`, to: today } },
  ];
}
