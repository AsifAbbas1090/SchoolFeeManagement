import { listStudentsWithDues } from "@/lib/students";
import { PageHeader } from "@/components/ui";
import StudentsTable from "@/components/StudentsTable";

export const metadata = { title: "Students · Management" };
export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const students = await listStudentsWithDues();
  const active = students.filter((s) => s.status === "ACTIVE").length;
  return (
    <>
      <PageHeader title="Students" subtitle={`${active} active student${active === 1 ? "" : "s"}`} />
      <StudentsTable students={students} basePath="/manager/students" />
    </>
  );
}
