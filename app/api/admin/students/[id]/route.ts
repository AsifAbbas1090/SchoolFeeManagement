import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseStudentInput } from "@/lib/studentInput";

// PATCH /api/admin/students/:id — Admin edits any student field, including fees.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const parsed = parseStudentInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });
  }

  try {
    // id AND campus: a student of another campus simply doesn't exist for this admin.
    const { count } = await prisma.student.updateMany({ where: { id: params.id, campusId: auth.session.campusId }, data: parsed.data });
    if (count === 0) return NextResponse.json({ error: "Student not found." }, { status: 404 });
    return NextResponse.json({ student: { id: params.id } });
  } catch (err) {
    console.error("Update student failed:", err);
    return NextResponse.json({ error: "Could not save changes. Try again." }, { status: 500 });
  }
}

// DELETE /api/admin/students/:id — Admin only, and only for a student with NO payments
// (e.g. added by mistake). Anyone with payment history must be marked LEFT instead, so financial
// records are never lost.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const student = await prisma.student.findFirst({
    where: { id: params.id, campusId: auth.session.campusId },
    select: { name: true, _count: { select: { feePayments: true } } },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const n = student._count.feePayments;
  if (n > 0) {
    return NextResponse.json(
      { error: `${student.name} has ${n} payment${n === 1 ? "" : "s"} on record, so they can't be deleted. Mark them as Left instead.` },
      { status: 409 }
    );
  }

  try {
    // deleteMany with the "no payments" condition closes the race where a payment arrives mid-delete.
    const { count } = await prisma.student.deleteMany({ where: { id: params.id, campusId: auth.session.campusId, feePayments: { none: {} } } });
    if (count === 0) return NextResponse.json({ error: "A payment was just recorded for this student — mark them as Left instead." }, { status: 409 });
    return NextResponse.json({ ok: true, name: student.name });
  } catch (err) {
    console.error("Delete student failed:", err);
    return NextResponse.json({ error: "Could not delete the student. Try again." }, { status: 500 });
  }
}
