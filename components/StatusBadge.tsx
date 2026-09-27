type Status = "PENDING" | "CONFIRMED" | "APPROVED" | "REJECTED";

// Pending = neutral outline, Confirmed/Approved = emerald, Rejected = the one warning red.
export default function StatusBadge({ status }: { status: Status }) {
  const styles: Record<Status, [string, string]> = {
    PENDING: ["border border-border text-foreground/80", "Pending"],
    CONFIRMED: ["bg-accent-soft text-accent", "Confirmed"],
    APPROVED: ["bg-accent-soft text-accent", "Approved"],
    REJECTED: ["bg-warn-soft text-warn", "Rejected"],
  };
  const [cls, label] = styles[status];
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
