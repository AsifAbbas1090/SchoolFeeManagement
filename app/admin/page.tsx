import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getReconciliation } from "@/lib/reconciliation";
import { listStudentsWithDues } from "@/lib/students";
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
  const now = new Date();
  const sum = (r: { _sum: { amount: number | null } }) => r._sum.amount ?? 0;
  const sixMonthsAgo = startOfMonth(addMonthsKey(monthKey(now), -5));
  const thirtyDaysAgo = startOfDay(addDaysKey(dayKey(now), -29));
  const chartFrom = sixMonthsAgo < thirtyDaysAgo ? sixMonthsAgo : thirtyDaysAgo;
  const [lmFrom, lmTo] = lastMonthToDate(now);

  const [today, month, lastMonthSoFar, allTime, expMonth, expAll, recon, students, pending, recentPayments, recentExpenses] =
    await Promise.all([
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: startOfDay() } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: startOfMonth() } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true }, where: { paymentDate: { gte: lmFrom, lt: lmTo } } }),
      prisma.feePayment.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { expenseDate: { gte: startOfMonth() } } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      getReconciliation({}, now),
      listStudentsWithDues(),
      prisma.submission.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PENDING" } }),
      prisma.feePayment.findMany({ where: { paymentDate: { gte: chartFrom } }, select: { amount: true, paymentDate: true } }),
      prisma.expense.findMany({ where: { expenseDate: { gte: sixMonthsAgo } }, select: { amount: true, expenseDate: true } }),
    ]);

  const daily = bucketize(recentPayments, "day", 30, now);
  const collectedMonths = bucketize(recentPayments, "month", 6, now);
  const expenseMonths = bucketize(recentExpenses.map((e) => ({ amount: e.amount, paymentDate: e.expenseDate })), "month", 6, now);

  const owing = students.filter((s) => s.due > 0);
  const outstanding = owing.reduce((s, x) => s + x.due, 0);
  const flagged = recon.filter((r) => r.flagLarge || r.flagOld).length;
  const netMonth = sum(month) - sum(expMonth);
  const netAll = sum(allTime) - sum(expAll);

  return (
    <>
      <PageHeader title="Dashboard" subtitle={longToday(now)} />

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
          <StatCard label="Collected today" value={formatRs(sum(today))} icon="coins" />
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
          value={formatRs(outstanding)}
          icon="alert"
          tone={outstanding > 0 ? "warn" : "default"}
          hint={`${owing.length} student${owing.length === 1 ? "" : "s"} owe fees`}
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
        {pending._count > 0 && (
          <Link href="/admin/submissions" className="text-sm font-medium text-accent hover:underline">
            {pending._count} submission{pending._count === 1 ? "" : "s"} ({formatRs(sum(pending))}) waiting for you to confirm →
          </Link>
        )}
      </div>
      <ReconciliationTable rows={recon} />
    </>
  );
}
