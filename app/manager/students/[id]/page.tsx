import StudentDetail from "@/components/StudentDetail";

export const metadata = { title: "Student · Management" };
export const dynamic = "force-dynamic";

export default function StudentPage({ params, searchParams }: { params: { id: string }; searchParams: { added?: string } }) {
  return <StudentDetail id={params.id} basePath="/manager/students" isAdmin={false} justAdded={searchParams.added === "1"} />;
}
