export default function StatusBadge({ status }: { status: "PENDING" | "CONFIRMED" }) {
  return status === "CONFIRMED" ? (
    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">Confirmed</span>
  ) : (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-foreground/80">Pending</span>
  );
}
