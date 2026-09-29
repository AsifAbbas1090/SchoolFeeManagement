import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { listStudents } from "@/lib/students";
import { PageHeader, primaryButtonClass } from "@/components/ui";
import StudentsTable from "@/components/StudentsTable";
import Icon from "@/components/icons";

export const metadata = { title: "Students · Management" };
export const dynamic = "force-dynamic";

type Search = { q?: string; due?: string; left?: string; page?: string; deleted?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Search }) {
  const actor = await requireRole("MANAGER");
  const list = await listStudents(actor.campusId, {
    q: searchParams.q,
    onlyDue: searchParams.due === "1",
    includeLeft: searchParams.left === "1",
    page: Number(searchParams.page) || 1,
  });
  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${list.activeCount} active student${list.activeCount === 1 ? "" : "s"}`}
        action={
          <div className="flex gap-2">
            <Link href="/manager/students/new" className={primaryButtonClass}>
              <Icon name="students" size={16} /> Add student
            </Link>
            <Link href="/manager/students/import" className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground/30">
              Import
            </Link>
          </div>
        }
      />
      {searchParams.deleted && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">✓ Deleted {searchParams.deleted}.</p>
      )}
      <StudentsTable rows={list.rows} basePath="/manager/students" total={list.total} page={list.page} pages={list.pages} leftCount={list.leftCount} />
    </>
  );
}
