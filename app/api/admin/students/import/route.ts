import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/apiAuth";
import { duplicateKey, markDuplicates, parseImportFile, type ImportRow } from "@/lib/studentImport";

// POST /api/admin/students/import  (multipart: file, mode = "preview" | "commit")
// Both modes parse and validate the uploaded file on the server. "commit" re-parses the same file
// rather than trusting rows sent back from the browser, then inserts every valid row in one transaction.
export async function POST(req: Request) {
  const auth = await requireApiRole("ADMIN");
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

  const loadExistingKeys = async (db: Pick<typeof prisma, "student">) =>
    new Set((await db.student.findMany({ select: { name: true, fatherName: true } })).map((s) => duplicateKey(s.name, s.fatherName)));

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
      const res = await tx.student.createMany({
        data: valid.map((r) => ({ ...r.data!, createdById: auth.session.sub })),
      });
      return res.count;
    });
    return NextResponse.json({ ...summarize(rows), created });
  } catch (err) {
    console.error("Student import failed:", err);
    return NextResponse.json({ error: "Import failed — nothing was saved. Try again." }, { status: 500 });
  }
}
