import { requireRole } from "@/lib/auth";
import StudentDetail from "@/components/StudentDetail";

export const metadata = { title: "Student · Admin" };
export const dynamic = "force-dynamic";

export default async function StudentPage({ params, searchParams }: { params: { id: string }; searchParams: { added?: string } }) {
  const actor = await requireRole("ADMIN");
  return (
    <StudentDetail campusId={actor.campusId} id={params.id} basePath="/admin/students" isAdmin={true} justAdded={searchParams.added === "1"} />
  );
}
