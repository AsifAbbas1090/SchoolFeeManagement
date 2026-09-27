"use client";

import { useId, useState } from "react";
import { monotonePath, niceTicks, shortRs } from "@/components/charts/scale";

export type AreaPoint = { key: string; label: string; value: number; display: string; count?: number };

const W = 1000; // internal SVG width; the SVG stretches to the container

/**
 * Single-series trend: 2px emerald line on a soft gradient wash, hover crosshair + tooltip
 * (mouse, touch or ←/→ keys), peak labelled directly, table view for exact values.
 */
export default function AreaChart({
  points,
  height = 180,
  labelEvery = 5,
  seriesName = "Collected",
  emptyText = "No collections in this period yet.",
}: {
  points: AreaPoint[];
  height?: number;
  labelEvery?: number;
  seriesName?: string;
  emptyText?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)));
  const top = ticks[ticks.length - 1];
  const H = height;
  const PAD = 6; // keep the line off the very top edge
  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) => H - (v / top) * (H - PAD);
  const pts = points.map((p, i) => [x(i), y(p.value)] as [number, number]);
  const line = monotonePath(pts);
  const area = n ? `${line} L${x(n - 1)},${H} L${x(0)},${H} Z` : "";
  const total = points.reduce((s, p) => s + p.value, 0);
  const peak = points.reduce((b, p, i) => (p.value > points[b].value ? i : b), 0);
  const pct = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);

  function onMove(clientX: number, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.round(t * (n - 1)));
  }

  if (total === 0) {
    return <p className="flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted" style={{ height: H + 24 }}>{emptyText}</p>;
  }

  const hp = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="flex gap-2 pt-2">
        <div className="relative w-9 shrink-0 text-right text-[10px] tabular-nums text-muted" style={{ height: H }} aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: y(t) }}>{shortRs(t)}</span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="relative cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            style={{ height: H }}
            tabIndex={0}
            role="img"
            aria-label={`${seriesName} trend. Peak ${points[peak].label}: ${points[peak].display}. Use arrow keys to step through days; full values in the table below.`}
            onMouseMove={(e) => onMove(e.clientX, e.currentTarget)}
            onTouchMove={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
            onTouchStart={(e) => onMove(e.touches[0].clientX, e.currentTarget)}
            onMouseLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? -1) + 1));
              else if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n) - 1));
              else return;
              e.preventDefault();
            }}
          >
            {/* hairline grid */}
            {ticks.map((t) => (
              <div key={t} aria-hidden="true" className={`absolute inset-x-0 ${t === 0 ? "bg-border" : "bg-grid"}`} style={{ top: y(t), height: 1 }} />
            ))}

            <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--chart))" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="rgb(var(--chart))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={area} fill={`url(#fill-${gid})`} />
              <path d={line} fill="none" stroke="rgb(var(--chart))" strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* peak label (hidden while hovering so it never collides with the tooltip) */}
            {hover === null && points[peak].value > 0 && (
              <span
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1.5 text-[10px] font-semibold tabular-nums text-foreground/80"
                style={{ left: `${Math.min(94, Math.max(6, pct(peak)))}%`, top: y(points[peak].value) }}
                aria-hidden="true"
              >
                {shortRs(points[peak].value)}
              </span>
            )}

            {/* latest point marker */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart ring-2 ring-surface"
              style={{ left: `${pct(n - 1)}%`, top: y(points[n - 1].value) }}
            />

            {hp && hover !== null && (
              <>
                <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-px bg-foreground/25" style={{ left: `${pct(hover)}%` }} />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart ring-[3px] ring-surface"
                  style={{ left: `${pct(hover)}%`, top: y(hp.value) }}
                />
                <div
                  role="tooltip"
                  className="pointer-events-none absolute z-10 whitespace-nowrap rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] px-3 py-2 text-xs shadow-lg"
                  style={{
                    left: `${pct(hover)}%`,
                    top: Math.max(0, y(hp.value) - 64),
                    transform: `translateX(${pct(hover) > 70 ? "calc(-100% - 10px)" : "10px"})`,
                  }}
                >
                  <p className="text-muted">{hp.label}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums">
                    <span className="h-2 w-2 rounded-full bg-chart" aria-hidden="true" />
                    {hp.display}
                  </p>
                  {hp.count !== undefined && <p className="text-muted">{hp.count} payment{hp.count === 1 ? "" : "s"}</p>}
                </div>
              </>
            )}
          </div>

          <div className="flex text-[10px] text-muted" aria-hidden="true">
            {points.map((p, i) => {
              const shown = (n - 1 - i) % labelEvery === 0;
              return (
                <span key={p.key} className="flex flex-1 flex-col items-center whitespace-nowrap">
                  <span className={`h-1 w-px ${shown ? "bg-border" : ""}`} />
                  {shown ? p.label : ""}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <ChartTable rows={points.map((p) => ({ key: p.key, label: p.label, cells: [p.count ?? "", p.display] }))} headers={["Payments", seriesName]} />
    </div>
  );
}

export function ChartTable({ rows, headers }: { rows: { key: string; label: string; cells: (string | number)[] }[]; headers: string[] }) {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Show as table</summary>
      <div className="mt-2 max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-medium">Period</th>
              {headers.map((h) => (
                <th key={h} className="py-1 text-right font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((r) => (
              <tr key={r.key} className="border-t border-border">
                <td className="py-1">{r.label}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className="py-1 text-right tabular-nums">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
