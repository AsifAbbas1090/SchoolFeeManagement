import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getManagerTotals } from "@/lib/stats";
import { bucketize } from "@/lib/reports";
import { addDaysKey, dayKey, lastMonthToDate, longToday, startOfDay } from "@/lib/time";
import { formatRs } from "@/lib/format";
import { toArea } from "@/lib/chartData";
import { PageHeader, StatCard, TrendPill, primaryButtonClass, trendOf } from "@/components/ui";
import AreaChart from "@/components/charts/AreaChart";
import Icon from "@/components/icons";

export const metadata = { title: "Dashboard · Management" };
export const dynamic = "force-dynamic";

export default async function ManagerDashboard() {
  const session = await requireRole("MANAGER");
  const now = new Date();
  const [lmFrom, lmTo] = lastMonthToDate(now);
  const mine = { collectedById: session.sub }; // every query below is scoped to this manager

  const [t, recent, lastMonthSoFar] = await Promise.all([
    getManagerTotals(session.sub, now),
    prisma.feePayment.findMany({
      where: { ...mine, paymentDate: { gte: startOfDay(addDaysKey(dayKey(now), -13)) } },
      select: { amount: true, paymentDate: true },
    }),
    prisma.feePayment.aggregate({ _sum: { amount: true }, where: { ...mine, paymentDate: { gte: lmFrom, lt: lmTo } } }),
  ]);

  const days = bucketize(recent, "day", 14, now);

  return (
    <>
      <PageHeader
        title={`Hello, ${session.name.split(" ")[0]}`}
        subtitle={longToday(now)}
        action={
          <div className="flex gap-2">
            <Link href="/manager/payments/new" className={primaryButtonClass}>
              <Icon name="coins" size={16} /> Record payment
            </Link>
            <Link
              href="/manager/submit"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] px-4 py-2 text-sm font-medium hover:border-foreground/30"
            >
              <Icon name="send" size={16} /> Submit
            </Link>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <section className="hero-glow rounded-2xl border border-border p-5 shadow-sm md:p-6 xl:col-span-2">
          <p className="text-sm font-medium text-muted">Collected this month</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{formatRs(t.thisMonth)}</p>
          <div className="mt-2 text-xs">
            <TrendPill trend={trendOf(t.thisMonth, lastMonthSoFar._sum.amount ?? 0, "vs same days last month")} />
          </div>
          <div className="mt-4">
            <p className="mb-1 text-xs font-medium text-muted">Your collections · last 14 days</p>
            <AreaChart points={toArea(days)} height={150} labelEvery={3} emptyText="No collections in the last 14 days." />
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          <StatCard label="Collected today" value={formatRs(t.today)} icon="coins" />
          <StatCard
            label="Submitted to Admin"
            value={formatRs(t.submitted)}
            icon="send"
            hint={`${formatRs(t.submittedConfirmed)} confirmed · ${formatRs(t.submittedPending)} pending`}
          />
          <StatCard label="Cash in hand" value={formatRs(t.inHand)} icon="wallet" tone="accent" hint={t.expensesPending + t.expensesApproved > 0 ? "Collected − submitted − expenses" : "Collected so far − submitted"} />
        </div>
      </div>
    </>
  );
}
