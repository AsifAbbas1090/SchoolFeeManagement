import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
    const student = await prisma.student.update({ where: { id: params.id }, data: parsed.data, select: { id: true } });
    return NextResponse.json({ student });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }
    console.error("Update student failed:", err);
    return NextResponse.json({ error: "Could not save changes. Try again." }, { status: 500 });
  }
}
