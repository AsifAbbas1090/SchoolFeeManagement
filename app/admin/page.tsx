import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getReconciliation } from "@/lib/reconciliation";
import { campusDueTotals } from "@/lib/students";
import { requireRole } from "@/lib/auth";
import { bucketize } from "@/lib/reports";
import { addDaysKey, addMonthsKey, dayKey, lastMonthToDate, longToday, monthKey, startOfDay, startOfMonth } from "@/lib/time";
import { formatRs } from "@/lib/format";
import { toArea, toLabels, toSeries } from "@/lib/chartData";
import { Card, PageHeader, StatCard, TrendPill, trendOf } from "@/components/ui";
import ReconciliationTable from "@/components/ReconciliationTable";
import AreaChart from "@/components/charts/AreaChart";
import ColumnChart from "@/components/charts/ColumnChart";

export const metadata = { title: "Dashboard · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const actor = await requireRole("ADMIN");
  const c = { campusId: actor.campusId }; // every figure below is this campus only
  const now = new Date();
  const sum = (r: { _sum: { amount: number | null } }) => r._sum.amount ?? 0;
  const sixMonthsAgo = startOfMonth(addMonthsKey(monthKey(now), -5));
  const thirtyDaysAgo = startOfDay(addDaysKey(dayKey(now), -29));
  const chartFrom = sixMonthsAgo < thirtyDaysAgo ? sixMonthsAgo : thirtyDaysAgo;
  const [lmFrom, lmTo] = lastMonthToDate(now);

  const [today, month, lastMonthSoFar, allTime, pfMonth, expMonth, expAll, recon, dues, pending, recentPayments, recentExpenses, expensesToReview] =
    await Promise.all([
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...c, paymentDate: { gte: startOfDay() } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...c, paymentDate: { gte: startOfMonth() } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...c, paymentDate: { gte: lmFrom, lt: lmTo } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: c }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...c, feeType: "PAPER_FUND", paymentDate: { gte: startOfMonth() } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { ...c, status: "APPROVED", expenseDate: { gte: startOfMonth() } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { ...c, status: "APPROVED" } }),
      getReconciliation({ campusId: actor.campusId }, now),
      campusDueTotals(actor.campusId),
      prisma.submission.aggregate({ _sum: { amount: true }, _count: true, where: { ...c, status: "PENDING" } }),
      prisma.feePayment.findMany({ where: { ...c, paymentDate: { gte: chartFrom } }, select: { amount: true, paymentDate: true } }),
      prisma.expense.findMany({ where: { ...c, status: "APPROVED", expenseDate: { gte: sixMonthsAgo } }, select: { amount: true, expenseDate: true } }),
      prisma.expense.aggregate({ _sum: { amount: true }, _count: true, where: { ...c, status: "PENDING" } }),
    ]);

  const daily = bucketize(recentPayments, "day", 30, now);
  const collectedMonths = bucketize(recentPayments, "month", 6, now);
  const expenseMonths = bucketize(recentExpenses.map((e) => ({ amount: e.amount, paymentDate: e.expenseDate })), "month", 6, now);

  const flagged = recon.filter((r) => r.flagLarge || r.flagOld).length;
  const netMonth = sum(month) - sum(expMonth);
  const netAll = sum(allTime) - sum(expAll);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${actor.campusName} · ${longToday(now)}`} />

      {/* Hero: the one number Admin opens this page for, with its 30-day trend */}
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <section className="hero-glow rounded-2xl border border-border p-5 shadow-sm md:p-6 xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">Collected this month</p>
              <p className="mt-1 text-5xl font-semibold tracking-tight">{formatRs(sum(month))}</p>
              <div className="mt-2 text-xs">
                <TrendPill trend={trendOf(sum(month), sum(lastMonthSoFar), "vs same days last month")} />
              </div>
            </div>
            <Link href="/admin/reports" className="text-sm font-medium text-accent hover:underline">Full report →</Link>
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-muted">Daily collections · last 30 days</p>
            <AreaChart points={toArea(daily)} height={170} labelEvery={7} />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatCard label="Collected today" value={formatRs(sum(today))} icon="coins" hint={`Paper Fund this month: ${formatRs(sum(pfMonth))}`} />
          <StatCard label="Expenses this month" value={formatRs(sum(expMonth))} icon="receipt" />
          <StatCard label="Net this month" value={formatRs(netMonth)} icon="wallet" tone={netMonth < 0 ? "warn" : "accent"} hint="Collected − expenses" />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected · all time" value={formatRs(sum(allTime))} icon="chart" />
        <StatCard label="Expenses · all time" value={formatRs(sum(expAll))} icon="receipt" />
        <StatCard label="Net · all time" value={formatRs(netAll)} icon="wallet" tone={netAll < 0 ? "warn" : "default"} />
        <StatCard
          label="Outstanding dues"
          value={formatRs(dues.totalDue)}
          icon="alert"
          tone={dues.totalDue > 0 ? "warn" : "default"}
          hint={`${dues.studentsOwing} student${dues.studentsOwing === 1 ? "" : "s"} · ${formatRs(dues.tuitionDue)} tuition + ${formatRs(dues.pfDue)} PF`}
        />
      </div>

      <Card title="Collected vs expenses · last 6 months" className="mb-6">
        <ColumnChart
          labels={toLabels(collectedMonths)}
          series={[toSeries("Collected", "primary", collectedMonths), toSeries("Expenses", "neutral", expenseMonths)]}
          height={190}
        />
      </Card>

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Cash with managers
          {flagged > 0 && (
            <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 align-middle text-xs font-medium text-warn">
              ⚠ {flagged} need{flagged === 1 ? "s" : ""} attention
            </span>
          )}
        </h2>
        <div className="flex flex-col items-end gap-1">
          {pending._count > 0 && (
            <Link href="/admin/submissions" className="text-sm font-medium text-accent hover:underline">
              {pending._count} submission{pending._count === 1 ? "" : "s"} ({formatRs(sum(pending))}) waiting for you to confirm →
            </Link>
          )}
          {expensesToReview._count > 0 && (
            <Link href="/admin/expenses" className="text-sm font-medium text-accent hover:underline">
              {expensesToReview._count} manager expense{expensesToReview._count === 1 ? "" : "s"} ({formatRs(sum(expensesToReview))}) to approve →
            </Link>
          )}
        </div>
      </div>
      <ReconciliationTable rows={recon} />
    </>
  );
}
