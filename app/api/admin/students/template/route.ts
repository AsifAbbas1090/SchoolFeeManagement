import { requireApiRole } from "@/lib/apiAuth";
import { templateCsv } from "@/lib/studentImport";

// GET /api/admin/students/template — header row + one example row (blank admission_fee = optional).
export async function GET() {
  const auth = await requireApiRole("ADMIN");
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
