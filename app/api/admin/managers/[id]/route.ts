import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";

// PATCH /api/admin/managers/:id  { active: boolean } — deactivate / reactivate a manager (own campus).
// Deactivated managers can't log in and an open session stops working on their next request.
// Nothing they recorded is removed: payments, submissions and expenses stay in every report.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  if (typeof body?.active !== "boolean") return NextResponse.json({ error: "active must be true or false." }, { status: 400 });

  const { count } = await prisma.user.updateMany({
    where: { id: params.id, role: "MANAGER", campusId: auth.session.campusId },
    data: { isActive: body.active },
  });
  if (count === 0) return NextResponse.json({ error: "Manager not found." }, { status: 404 });
  return NextResponse.json({ ok: true, active: body.active });
}

// DELETE /api/admin/managers/:id — only for a manager with NO records at all (e.g. created by mistake).
// Anyone who ever collected, submitted, spent or added a student must be deactivated instead,
// so the hisab-kitab keeps their name on every record.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.error) return auth.error;

  const m = await prisma.user.findFirst({
    where: { id: params.id, role: "MANAGER", campusId: auth.session.campusId },
    select: {
      name: true,
      _count: { select: { feePayments: true, submissions: true, expensesAdded: true, studentsAdded: true } },
    },
  });
  if (!m) return NextResponse.json({ error: "Manager not found." }, { status: 404 });

  const n = m._count.feePayments + m._count.submissions + m._count.expensesAdded + m._count.studentsAdded;
  if (n > 0) {
    return NextResponse.json(
      { error: `${m.name} has ${n} record${n === 1 ? "" : "s"} (payments, submissions, expenses or students), so they can't be deleted. Deactivate them instead — their records stay.` },
      { status: 409 }
    );
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, name: m.name });
  } catch (err) {
    // A record arrived between the check and the delete — the foreign keys refuse it. Safe.
    console.error("Delete manager failed:", err);
    return NextResponse.json({ error: "This manager now has records — deactivate them instead." }, { status: 409 });
  }
}
