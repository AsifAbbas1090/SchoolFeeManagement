import { listStudentsWithDues } from "@/lib/students";
import Link from "next/link";
import { PageHeader, primaryButtonClass } from "@/components/ui";
import StudentsTable from "@/components/StudentsTable";

export const metadata = { title: "Students · Admin" };
export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await listStudentsWithDues();
  const active = students.filter((s) => s.status === "ACTIVE").length;
  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${active} active student${active === 1 ? "" : "s"}`}
        action={<Link href="/admin/students/import" className={primaryButtonClass}>Import students</Link>}
      />
      <StudentsTable students={students} basePath="/admin/students" />
    </>
  );
}
