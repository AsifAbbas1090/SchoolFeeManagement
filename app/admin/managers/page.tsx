import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder, primaryButtonClass } from "@/components/ui";

export const metadata = { title: "Managers · Admin" };
export const dynamic = "force-dynamic";

export default async function ManagersPage({ searchParams }: { searchParams: { created?: string } }) {
  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, username: true, phone: true, isActive: true, createdAt: true },
  });

  const created = searchParams.created;

  return (
    <>
      <PageHeader
        title="Managers"
        subtitle={`${managers.length} fee collector${managers.length === 1 ? "" : "s"}`}
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
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b border-border last:border-0 ${m.username === created ? "bg-accent-soft/60" : ""}`}
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
                  <td className="px-4 py-3 text-muted">
                    {m.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
