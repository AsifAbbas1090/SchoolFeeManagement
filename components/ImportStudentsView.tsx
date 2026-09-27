import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IMPORT_COLUMNS } from "@/lib/studentImport";
import ImportStudents from "@/components/ImportStudents";

// Import page body, shared by /admin/students/import and /manager/students/import.
export default function ImportStudentsView({ base }: { base: "/admin" | "/manager" }) {
  return (
    <>
      <Link href={`${base}/students`} className="mb-3 inline-block text-sm text-muted hover:text-foreground">
        ← All students
      </Link>
      <PageHeader
        title="Import students"
        subtitle="Add many students at once from a .csv or .xlsx spreadsheet"
        action={
          <a
            href={`/api${base}/students/template`}
            download
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm hover:bg-foreground/5"
          >
            Download Template
          </a>
        }
      />

      <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-sm shadow-sm shadow-black/[0.03]">
        <p className="mb-2 font-medium">Expected columns (first row must be these headers):</p>
        <p className="font-mono text-xs">{IMPORT_COLUMNS.join(", ")}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
          <li>name, father_name, class, phone_number and monthly_fee are required on every row.</li>
          <li>class is free text: write it however you like, e.g. Class 5, Nursery, 8-B.</li>
          <li>admission_fee can be left blank. Fees are whole rupees.</li>
          <li>Nothing is saved until you check the preview and click Confirm Import.</li>
        </ul>
      </div>

      <ImportStudents base={base} />
    </>
  );
}
