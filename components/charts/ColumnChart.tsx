"use client";

import { useState } from "react";
import { niceTicks, shortRs } from "@/components/charts/scale";
import { ChartTable } from "@/components/charts/AreaChart";

export type ColumnSeries = {
  name: string;
  tone: "primary" | "neutral"; // emerald or grey — the only two chart colours
  values: number[];
  displays: string[];
};

const barTone = { primary: "bg-chart", neutral: "bg-chart-2" } as const;

/**
 * Columns for one or two series on ONE shared axis (both are rupees). Bars ≤20px with 4px rounded
 * tops, 2px gap between paired bars, legend when there are two series, hover/focus tooltip,
 * peak of the first series labelled directly, table view for exact values.
 */
export default function ColumnChart({
  labels,
  series,
  counts,
  height = 170,
  labelEvery = 1,
  emptyText = "Nothing recorded in this period yet.",
}: {
  labels: { key: string; label: string }[];
  series: ColumnSeries[];
  counts?: number[]; // payments per bucket, shown in the tooltip
  height?: number;
  labelEvery?: number;
  emptyText?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = height;
  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.max(0, ...all));
  const top = ticks[ticks.length - 1];
  const first = series[0];
  const peak = first.values.reduce((b, v, i) => (v > first.values[b] ? i : b), 0);
  const n = labels.length;

  if (all.every((v) => v === 0)) {
    return <p className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted" style={{ height: H + 24 }}>{emptyText}</p>;
  }

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted" aria-label="Legend">
          {series.map((s) => (
            <li key={s.name} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-sm ${barTone[s.tone]}`} aria-hidden="true" />
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-2">
        <div className="relative w-9 shrink-0 text-right text-[10px] tabular-nums text-muted" style={{ height: H }} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * H}px` }}>{shortRs(t)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: H }}>
            {ticks.map((t) => (
              <div key={t} aria-hidden="true" className={`absolute inset-x-0 ${t === 0 ? "bg-border" : "bg-grid"}`} style={{ bottom: `${(t / top) * H}px`, height: 1 }} />
            ))}

            <div className="absolute inset-0 flex items-end" onMouseLeave={() => setHover(null)}>
              {labels.map((l, i) => {
                const peakH = (first.values[i] / top) * H;
                return (
                  // Full-height slot = generous hit target; bars stay thin.
                  <div
                    key={l.key}
                    tabIndex={0}
                    aria-label={`${l.label}: ${series.map((s) => `${s.name} ${s.displays[i]}`).join(", ")}`}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    onTouchStart={() => setHover(i)}
                    className={`relative flex h-full flex-1 items-end justify-center gap-[2px] px-[3px] outline-none transition-colors ${hover === i ? "bg-foreground/[0.04]" : ""} focus-visible:bg-foreground/[0.06]`}
                  >
                    {i === peak && first.values[i] > 0 && hover === null && (
                      <span className="pointer-events-none absolute text-[10px] font-semibold tabular-nums text-foreground/80" style={{ bottom: peakH + 4 }} aria-hidden="true">
                        {shortRs(first.values[i])}
                      </span>
                    )}
                    {series.map((s) => {
                      const h = s.values[i] > 0 ? Math.max(3, (s.values[i] / top) * H) : 0;
                      return (
                        <div
                          key={s.name}
                          className={`w-full max-w-5 rounded-t-[4px] ${barTone[s.tone]} transition-opacity ${hover !== null && hover !== i ? "opacity-35" : ""}`}
                          style={{ height: h }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {hover !== null && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${((hover + 0.5) / n) * 100}%`,
                  bottom: Math.min(H - 10, (Math.max(...series.map((s) => s.values[hover])) / top) * H + 10),
                  transform: `translateX(${(hover + 0.5) / n > 0.7 ? "calc(-100% + 8px)" : "-8px"})`,
                }}
              >
                <p className="text-muted">{labels[hover].label}</p>
                {series.map((s) => (
                  <p key={s.name} className="mt-0.5 flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-sm ${barTone[s.tone]}`} aria-hidden="true" />
                    {series.length > 1 && <span className="text-muted">{s.name}</span>}
                    <span className="ml-auto pl-2 font-semibold tabular-nums">{s.displays[hover]}</span>
                  </p>
                ))}
                {counts && <p className="mt-0.5 text-muted">{counts[hover]} payment{counts[hover] === 1 ? "" : "s"}</p>}
              </div>
            )}
          </div>

          <div className="flex text-[10px] text-muted" aria-hidden="true">
            {labels.map((l, i) => {
              const shown = (n - 1 - i) % labelEvery === 0;
              return (
                <span key={l.key} className="flex flex-1 flex-col items-center whitespace-nowrap">
                  <span className={`h-1 w-px ${shown ? "bg-border" : ""}`} />
                  {shown ? l.label.replace(/^w\/c /, "") : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <ChartTable
        headers={[...(counts ? ["Payments"] : []), ...series.map((s) => s.name)]}
        rows={labels.map((l, i) => ({ key: l.key, label: l.label, cells: [...(counts ? [counts[i]] : []), ...series.map((s) => s.displays[i])] }))}
      />
    </div>
  );
}
