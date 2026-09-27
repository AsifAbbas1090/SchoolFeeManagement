import Link from "next/link";
import { dayKey } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import StudentForm from "@/components/StudentForm";

export const metadata = { title: "Add Student · Management" };
export const dynamic = "force-dynamic";

export default function NewStudentPage() {
  return (
    <>
      <Link href="/manager/students" className="mb-3 inline-block text-sm text-muted hover:text-foreground">← All students</Link>
      <PageHeader
        title="Add student"
        subtitle="Adding many at once? Use Import instead."
        action={<Link href="/manager/students/import" className="text-sm font-medium text-accent hover:underline">Import from spreadsheet →</Link>}
      />
      <StudentForm
        method="POST"
        action="/api/manager/students"
        redirectTo="/manager/students/:id?added=1"
        submitLabel="Add student"
        initial={{ name: "", fatherName: "", className: "", phoneNumber: "", monthlyFee: "", admissionFee: "", admissionDate: dayKey() }}
      />
    </>
  );
}
