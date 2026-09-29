import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { toDateInput } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import StudentForm from "@/components/StudentForm";

export const metadata = { title: "Edit Student · Admin" };
export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const actor = await requireRole("ADMIN");
  const s = await prisma.student.findFirst({ where: { id: params.id, campusId: actor.campusId } });
  if (!s) notFound();

  return (
    <>
      <Link href={`/admin/students/${s.id}`} className="mb-3 inline-block text-sm text-muted hover:text-foreground">
        ← Back to {s.name}
      </Link>
      <PageHeader title="Edit student" subtitle="Fee changes apply to all months, including past ones" />
      <StudentForm
        method="PATCH"
        action={`/api/admin/students/${s.id}`}
        redirectTo={`/admin/students/${s.id}`}
        submitLabel="Save changes"
        initial={{
          name: s.name,
          fatherName: s.fatherName,
          className: s.className,
          phoneNumber: s.phoneNumber,
          monthlyFee: String(s.monthlyFee),
          admissionFee: s.admissionFee === null ? "" : String(s.admissionFee),
          admissionDate: toDateInput(s.admissionDate),
        }}
      />
    </>
  );
}
