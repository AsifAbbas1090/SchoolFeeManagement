import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { loadPaperFundRates } from "@/lib/students";
import { monthKey, startOfDay } from "@/lib/time";
import { feeTypeLabel, formatDateTime, formatRs } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RecordPaymentForm from "./RecordPaymentForm";

export const metadata = { title: "Record Payment · Management" };
export const dynamic = "force-dynamic";

export default async function RecordPaymentPage() {
  const session = await requireRole("MANAGER");

  // Students are searched on demand (/api/manager/students/search), not all sent to the browser.
  const [today, pf] = await Promise.all([
    prisma.feePayment.findMany({
      where: { collectedById: session.sub, campusId: session.campusId, paymentDate: { gte: startOfDay() } },
      orderBy: { paymentDate: "desc" },
      include: { student: { select: { name: true } } },
    }),
    loadPaperFundRates(session.campusId),
  ]);

  const todayTotal = today.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader title="Record Payment" subtitle="Search a student, check the amount, save. The form clears for the next one." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <RecordPaymentForm currentMonth={monthKey()} pfRates={Object.fromEntries(pf)} />

        <section aria-labelledby="today-heading" className="h-fit rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
          <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
            <h2 id="today-heading" className="text-sm font-semibold">Your payments today</h2>
            <span className="text-sm font-semibold tabular-nums">{formatRs(todayTotal)}</span>
          </div>
          {today.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Nothing recorded yet today.</p>
          ) : (
            <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
              {today.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.student.name}</p>
                    <p className="text-xs text-muted">
                      {feeTypeLabel(p.feeType, p.forMonth)} · {formatDateTime(p.paymentDate).split(", ").pop()}
                    </p>
                  </div>
                  <span className="whitespace-nowrap font-medium tabular-nums">{formatRs(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
