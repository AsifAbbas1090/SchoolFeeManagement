import StudentDetail from "@/components/StudentDetail";

export const metadata = { title: "Student · Admin" };
export const dynamic = "force-dynamic";

export default function StudentPage({ params }: { params: { id: string } }) {
  return <StudentDetail id={params.id} basePath="/admin/students" isAdmin={true} />;
}
