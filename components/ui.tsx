// Small shared UI pieces used across admin and manager pages.
import Icon, { type IconName } from "@/components/icons";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export type Trend = { pct: number | null; label: string }; // pct null = no comparison possible

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  tone?: "default" | "accent" | "warn";
  trend?: Trend;
}) {
  const iconBox =
    tone === "warn" ? "bg-warn-soft text-warn" : tone === "accent" ? "bg-accent-strong text-accent-fg" : "bg-accent-soft text-accent";
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.03] transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {icon && (
          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBox}`}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className={`mt-1 text-2xl font-semibold tracking-tight ${tone === "warn" ? "text-warn" : ""}`}>{value}</p>
      {(hint || trend) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {trend && <TrendPill trend={trend} />}
          {hint && <span>{hint}</span>}
        </div>
      )}
    </div>
  );
}

// ▲ 12% vs last month — up in accent, down in neutral (a dip isn't an error, so no warning red).
export function TrendPill({ trend }: { trend: Trend }) {
  if (trend.pct === null) return <span className="text-muted">{trend.label}</span>;
  const up = trend.pct >= 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${up ? "bg-accent-soft text-accent" : "bg-foreground/5 text-foreground/80"}`}>
      <Icon name={up ? "trendUp" : "trendDown"} size={12} />
      {up ? "+" : "−"}
      {Math.abs(trend.pct)}% <span className="font-normal text-muted">{trend.label}</span>
    </span>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-4 shadow-sm shadow-black/[0.03] md:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}

// Percentage change a → b, or null when there's no baseline to compare with.
export function trendOf(current: number, previous: number, label: string): Trend {
  return previous > 0
    ? { pct: Math.round(((current - previous) / previous) * 100), label }
    : { pct: null, label: "Nothing to compare yet" };
}

export const inputClass =
  "w-full rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 py-2 text-sm font-semibold text-accent-fg shadow-sm transition hover:bg-accent-strong/90 active:translate-y-px disabled:opacity-60";
