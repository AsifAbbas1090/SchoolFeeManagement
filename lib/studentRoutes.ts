// Route handlers shared by /api/admin/students/* and /api/manager/students/*. Both Admin and
// managers can add students (one by one or in bulk); each route file only picks the role.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { parseStudentInput } from "@/lib/studentInput";
import { duplicateKey, markDuplicates, parseImportFile, templateCsv, type ImportRow } from "@/lib/studentImport";
import type { SessionRole } from "@/lib/session";

// POST — add ONE student. Same validation + duplicate rule as the bulk import.
export async function createStudentHandler(req: Request, role: SessionRole) {
  const auth = await requireApiRole(role);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const parsed = parseStudentInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Please fix the highlighted fields.", fields: parsed.fields }, { status: 400 });

  // Duplicates are checked within the campus only — other campuses are separate schools.
  const key = duplicateKey(parsed.data.name, parsed.data.fatherName);
  const existing = await prisma.student.findMany({
    where: { campusId: auth.session.campusId, name: { equals: parsed.data.name, mode: "insensitive" } },
    select: { id: true, name: true, fatherName: true },
  });
  if (existing.some((s) => duplicateKey(s.name, s.fatherName) === key)) {
    const msg = "A student with this name and father's name already exists.";
    return NextResponse.json({ error: msg, fields: { name: msg } }, { status: 409 });
  }

  try {
    const student = await prisma.student.create({
      data: { ...parsed.data, createdById: auth.session.sub, campusId: auth.session.campusId },
      select: { id: true, name: true },
    });
    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    console.error("Create student failed:", err);
    return NextResponse.json({ error: "Could not add the student. Try again." }, { status: 500 });
  }
}

// POST (multipart: file, mode = "preview" | "commit") — bulk import.
// Both modes parse and validate the uploaded file on the server. "commit" re-parses the same file
// rather than trusting rows sent back from the browser, then inserts every valid row in one transaction.
export async function importStudentsHandler(req: Request, role: SessionRole) {
  const auth = await requireApiRole(role);
  if (auth.error) return auth.error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Upload a file." }, { status: 400 });
  }
  const file = form.get("file");
  const mode = form.get("mode") === "commit" ? "commit" : "preview";
  if (!(file instanceof File)) return NextResponse.json({ error: "Upload a file." }, { status: 400 });

  const parsed = parseImportFile(await file.arrayBuffer(), file.name);
  if (!parsed.ok) return NextResponse.json({ error: parsed.fileError }, { status: 400 });
  const { rows, ignoredColumns } = parsed;

  const campusId = auth.session.campusId;
  const loadExistingKeys = async (db: Pick<typeof prisma, "student">) =>
    new Set(
      (await db.student.findMany({ where: { campusId }, select: { name: true, fatherName: true } })).map((s) => duplicateKey(s.name, s.fatherName))
    );

  const summarize = (r: ImportRow[]) => ({
    rows: r.map(({ rowNumber, values, errors }) => ({ rowNumber, values, errors, valid: errors.length === 0 })),
    validCount: r.filter((x) => x.errors.length === 0).length,
    invalidCount: r.filter((x) => x.errors.length > 0).length,
    ignoredColumns,
  });

  if (mode === "preview") {
    markDuplicates(rows, await loadExistingKeys(prisma));
    return NextResponse.json(summarize(rows));
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      // Re-check duplicates inside the transaction so a double-click can't import twice.
      markDuplicates(rows, await loadExistingKeys(tx));
      const valid = rows.filter((r) => r.data);
      if (valid.length === 0) return 0;
      const res = await tx.student.createMany({ data: valid.map((r) => ({ ...r.data!, createdById: auth.session.sub, campusId })) });
      return res.count;
    });
    return NextResponse.json({ ...summarize(rows), created });
  } catch (err) {
    console.error("Student import failed:", err);
    return NextResponse.json({ error: "Import failed — nothing was saved. Try again." }, { status: 500 });
  }
}

// GET — CSV template: header row + one example row (blank admission_fee = optional).
export async function templateHandler(role: SessionRole) {
  const auth = await requireApiRole(role);
  if (auth.error) return auth.error;
  // BOM so Excel opens it as UTF-8 (keeps Urdu names intact).
  return new Response("﻿" + templateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="student-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
