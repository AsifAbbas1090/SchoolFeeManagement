import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/apiAuth";
import { searchPayableStudents } from "@/lib/students";

// GET /api/manager/students/search?q=ali — top matches in the manager's campus for Record Payment
// (active students, plus students who left but still owe). Replaces shipping every student to the browser.
export async function GET(req: Request) {
  const auth = await requireApiRole("MANAGER");
  if (auth.error) return auth.error;
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  const rows = await searchPayableStudents(auth.session.campusId, q);
  return NextResponse.json({
    students: rows.map((s) => ({
      id: s.id,
      name: s.name,
      fatherName: s.fatherName,
      className: s.className,
      monthlyFee: s.monthlyFee,
      admissionFee: s.admissionFee,
      left: s.status === "LEFT",
      tuitionDue: s.tuitionDue,
      pfDue: s.pfDue,
      due: s.due,
    })),
  });
}
