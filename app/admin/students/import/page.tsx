import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IMPORT_COLUMNS } from "@/lib/studentImport";
import ImportStudents from "./ImportStudents";

export const metadata = { title: "Import Students · Admin" };

export default function ImportStudentsPage() {
  return (
    <>
      <Link href="/admin/students" className="mb-3 inline-block text-sm text-muted hover:text-foreground">
        ← All students
      </Link>
      <PageHeader
        title="Import students"
        subtitle="Add many students at once from a .csv or .xlsx spreadsheet"
        action={
          <a
            href="/api/admin/students/template"
            download
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-black/5 dark:hover:bg-white/10"
          >
            Download Template
          </a>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-surface shadow-sm shadow-black/[0.03] p-4 text-sm">
        <p className="mb-2 font-medium">Expected columns (first row must be these headers):</p>
        <p className="font-mono text-xs">{IMPORT_COLUMNS.join(", ")}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li>name, father_name, class, phone_number and monthly_fee are required on every row.</li>
          <li>class is free text: write it however you like, e.g. Class 5, Nursery, 8-B.</li>
          <li>admission_fee can be left blank. Fees are whole rupees.</li>
          <li>Nothing is saved until you check the preview and click Confirm Import.</li>
        </ul>
      </div>

      <ImportStudents />
    </>
  );
}
