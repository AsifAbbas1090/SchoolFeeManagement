import Link from "next/link";
import { listStudentsWithDues } from "@/lib/students";
import { PageHeader, primaryButtonClass } from "@/components/ui";
import StudentsTable from "@/components/StudentsTable";
import Icon from "@/components/icons";

export const metadata = { title: "Students · Admin" };
export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: { deleted?: string } }) {
  const students = await listStudentsWithDues();
  const active = students.filter((s) => s.status === "ACTIVE").length;
  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${active} active student${active === 1 ? "" : "s"}`}
        action={
          <div className="flex gap-2">
            <Link href="/admin/students/new" className={primaryButtonClass}>
              <Icon name="students" size={16} /> Add student
            </Link>
            <Link href="/admin/students/import" className="inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-foreground/30">
              Import
            </Link>
          </div>
        }
      />
      {searchParams.deleted && (
        <p role="status" className="mb-4 rounded-md bg-accent-soft px-3 py-2 text-sm text-accent">✓ Deleted {searchParams.deleted}.</p>
      )}
      <StudentsTable students={students} basePath="/admin/students" />
    </>
  );
}
