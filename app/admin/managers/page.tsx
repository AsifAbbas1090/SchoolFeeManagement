import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getReconciliation } from "@/lib/reconciliation";
import { formatRs } from "@/lib/format";
import { PageHeader, Placeholder, primaryButtonClass } from "@/components/ui";
import ManagerActions from "./ManagerActions";

export const metadata = { title: "Managers · Admin" };
export const dynamic = "force-dynamic";

export default async function ManagersPage({ searchParams }: { searchParams: { created?: string } }) {
  const actor = await requireRole("ADMIN");
  const [managers, recon] = await Promise.all([
    prisma.user.findMany({
      where: { role: "MANAGER", campusId: actor.campusId },
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { feePayments: true, submissions: true, expensesAdded: true, studentsAdded: true } },
      },
    }),
    getReconciliation({ campusId: actor.campusId }),
  ]);
  const cashWith = new Map(recon.map((r) => [r.managerId, r.stillWith]));
  const active = managers.filter((m) => m.isActive).length;

  const created = searchParams.created;

  return (
    <>
      <PageHeader
        title="Managers"
        subtitle={`${active} active fee collector${active === 1 ? "" : "s"}${managers.length > active ? ` · ${managers.length - active} inactive (records kept)` : ""}`}
        action={<Link href="/admin/managers/new" className={primaryButtonClass}>Add manager</Link>}
      />

      {created && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">
          Manager <strong>{created}</strong> created. They can now log in with the password you set.
        </p>
      )}

      {managers.length === 0 ? (
        <Placeholder>No managers yet. Add one to let staff record fee payments.</Placeholder>
      ) : (
        <div className="relative overflow-x-auto rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03]">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Cash with them</th>
                <th className="px-4 py-3 font-medium">Added</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-border last:border-0 ${m.username === created ? "bg-accent-soft/60" : ""} ${m.isActive ? "" : "text-muted"}`}
                >
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/admin/managers/${m.id}`} className="text-accent hover:underline">{m.name}</Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{m.username}</td>
                  <td className="px-4 py-3">{m.phone ?? <span className="text-muted">—</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${m.isActive ? "bg-accent-soft text-accent" : "bg-foreground/10 text-foreground/80"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${(cashWith.get(m.id) ?? 0) > 0 ? "font-medium" : "text-muted"}`}>
                    {formatRs(cashWith.get(m.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {m.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <ManagerActions
                      id={m.id}
                      name={m.name}
                      isActive={m.isActive}
                      stillWith={cashWith.get(m.id) ?? 0}
                      hasRecords={m._count.feePayments + m._count.submissions + m._count.expensesAdded + m._count.studentsAdded > 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
