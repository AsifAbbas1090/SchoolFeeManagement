import { requireRole } from "@/lib/auth";
import StudentDetail from "@/components/StudentDetail";

export const metadata = { title: "Student · Management" };
export const dynamic = "force-dynamic";

export default async function StudentPage({ params, searchParams }: { params: { id: string }; searchParams: { added?: string } }) {
  const actor = await requireRole("MANAGER");
  return (
    <StudentDetail campusId={actor.campusId} id={params.id} basePath="/manager/students" isAdmin={false} justAdded={searchParams.added === "1"} />
  );
}
