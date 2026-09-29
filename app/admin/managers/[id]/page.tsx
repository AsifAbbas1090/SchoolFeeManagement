import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getReconciliation } from "@/lib/reconciliation";
import { bucketize, bucketWindowStart } from "@/lib/reports";
import { parseDateRange, startOfDay } from "@/lib/time";
import { datePresets } from "@/lib/presets";
import { formatDate, formatRs } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import UrlFilters from "@/components/UrlFilters";
import ReconciliationTable from "@/components/ReconciliationTable";
import AreaChart from "@/components/charts/AreaChart";
import ColumnChart from "@/components/charts/ColumnChart";
import { sumOf, toArea, toLabels, toSeries } from "@/lib/chartData";

export const metadata = { title: "Manager · Admin" };
export const dynamic = "force-dynamic";

export default async function ManagerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { from?: string; to?: string };
}) {
  const actor = await requireRole("ADMIN");
  // Another campus's manager simply doesn't exist here (404).
  const manager = await prisma.user.findFirst({
    where: { id: params.id, role: "MANAGER", campusId: actor.campusId },
    select: { id: true, name: true, username: true, phone: true, isActive: true, createdAt: true },
  });
  if (!manager) notFound();

  const range = parseDateRange(searchParams.from, searchParams.to);
  const ranged = Boolean(range.gte || range.lt);
  const now = new Date();

  const [[recon], payments] = await Promise.all([
    getReconciliation({ campusId: actor.campusId, managerId: manager.id, range: ranged ? range : undefined }, now),
    prisma.feePayment.findMany({
      where: { collectedById: manager.id, paymentDate: { gte: startOfDay(bucketWindowStart(now)) } },
      select: { amount: true, paymentDate: true },
    }),
  ]);

  const days = bucketize(payments, "day", 30, now);
  const weeks = bucketize(payments, "week", 12, now);
  const months = bucketize(payments, "month", 12, now);

  return (
    <>
      <Link href="/admin/managers" className="mb-3 inline-block text-sm text-muted hover:text-foreground">← All managers</Link>
      <PageHeader
        title={manager.name}
        subtitle={`@${manager.username}${manager.phone ? ` · ${manager.phone}` : ""} · added ${formatDate(manager.createdAt)}${manager.isActive ? "" : " · inactive"}`}
        action={
          <Link href={`/admin/reports?manager=${manager.id}`} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-black/5 dark:hover:bg-white/10">
            All payments →
          </Link>
        }
      />

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Reconciliation</h2>
        <UrlFilters presets={datePresets(now)} fields={[{ name: "from", label: "From", type: "date" }, { name: "to", label: "To", type: "date" }]} />
        <p className="mb-2 text-xs text-muted">
          {ranged
            ? "Showing only collections and submissions dated inside the chosen range. Clear the filters for the running balance."
            : "All-time: everything this manager has collected vs everything they've submitted."}
        </p>
        <ReconciliationTable rows={[recon]} linkNames={false} allTime={!ranged} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Collection trend</h2>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="By day · last 30 days" action={<span className="text-xs text-muted">Total {formatRs(sumOf(days))}</span>} className="xl:col-span-2">
            <AreaChart points={toArea(days)} labelEvery={5} />
          </Card>
          <Card title="By week · last 12 weeks" action={<span className="text-xs text-muted">Total {formatRs(sumOf(weeks))}</span>}>
            <ColumnChart labels={toLabels(weeks)} series={[toSeries("Collected", "primary", weeks)]} counts={weeks.map((w) => w.count)} labelEvery={3} />
          </Card>
          <Card title="By month · last 12 months" action={<span className="text-xs text-muted">Total {formatRs(sumOf(months))}</span>}>
            <ColumnChart labels={toLabels(months)} series={[toSeries("Collected", "primary", months)]} counts={months.map((m) => m.count)} labelEvery={2} />
          </Card>
        </div>
      </section>
    </>
  );
}
