import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";

// POST /api/admin/students/:id/status  { status: "LEFT" | "ACTIVE" }
// "Leaving" is a status flag, never a delete — payment history must survive.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const status = body?.status;
  if (status !== "LEFT" && status !== "ACTIVE") {
    return NextResponse.json({ error: 'status must be "LEFT" or "ACTIVE".' }, { status: 400 });
  }

  try {
    const leftAt = status === "LEFT" ? new Date() : null;
    const { count } = await prisma.student.updateMany({ where: { id: params.id, campusId: auth.session.campusId }, data: { status, leftAt } });
    if (count === 0) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json({ student: { id: params.id, status, leftAt } });
  } catch (err) {
    console.error("Update student status failed:", err);
    return NextResponse.json({ error: "Could not update the student. Try again." }, { status: 500 });
  }
}
