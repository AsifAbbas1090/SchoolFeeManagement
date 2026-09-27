import * as XLSX from "xlsx";
import { parseStudentInput, type StudentInput } from "@/lib/studentInput";

// Spreadsheet columns, in template order. `class` is required like the other text columns.
export const IMPORT_COLUMNS = ["name", "father_name", "class", "phone_number", "monthly_fee", "admission_fee"] as const;
type ImportColumn = (typeof IMPORT_COLUMNS)[number];
const REQUIRED_COLUMNS: ImportColumn[] = ["name", "father_name", "class", "phone_number", "monthly_fee"];

// Spreadsheet column -> StudentInput field (so error messages can name the column the user sees).
const FIELD_FOR: Record<ImportColumn, keyof StudentInput> = {
  name: "name",
  father_name: "fatherName",
  class: "className",
  phone_number: "phoneNumber",
  monthly_fee: "monthlyFee",
  admission_fee: "admissionFee",
};

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2000;

export type ImportRow = {
  rowNumber: number; // spreadsheet row number (header is row 1)
  values: Record<ImportColumn, string>;
  errors: string[];
  data?: StudentInput; // present only when the row is valid
};

export type ImportParseResult = { ok: false; fileError: string } | { ok: true; rows: ImportRow[]; ignoredColumns: string[] };

// "Father Name", " father_name " and "FATHER-NAME" all map to father_name.
const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

// Excel drops the leading 0 from phone numbers typed as numbers (03001234567 -> 3001234567).
function fixPhone(v: string): string {
  return /^3\d{9}$/.test(v) ? `0${v}` : v;
}

export function templateCsv(): string {
  const example = ["Ali Khan", "Imran Khan", "Class 5", "0300-1234567", "2000", ""];
  return `${IMPORT_COLUMNS.join(",")}\r\n${example.join(",")}\r\n`;
}

export function parseImportFile(buf: ArrayBuffer, fileName: string): ImportParseResult {
  if (!/\.(csv|xlsx)$/i.test(fileName)) return { ok: false, fileError: "Upload a .csv or .xlsx file." };
  if (buf.byteLength === 0) return { ok: false, fileError: "The file is empty." };
  if (buf.byteLength > MAX_IMPORT_BYTES) return { ok: false, fileError: "File is too large (max 2 MB)." };

  let sheet: XLSX.WorkSheet | undefined;
  try {
    // raw: true keeps CSV cells as text (so "0300..." and "2,000" survive untouched).
    const wb = XLSX.read(new Uint8Array(buf), { type: "array", raw: /\.csv$/i.test(fileName), dense: true });
    sheet = wb.Sheets[wb.SheetNames[0]];
  } catch {
    return { ok: false, fileError: "Could not read the file. Save it as .csv or .xlsx and try again." };
  }
  if (!sheet) return { ok: false, fileError: "The file has no sheets." };

  // Array of rows, each an array of cell strings as displayed in the sheet.
  const grid = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true });
  if (grid.length === 0) return { ok: false, fileError: "The file is empty." };

  const headers = grid[0].map((h) => normalizeHeader(String(h)));
  const colIndex = new Map<string, number>();
  headers.forEach((h, i) => h && !colIndex.has(h) && colIndex.set(h, i));

  const missing = REQUIRED_COLUMNS.filter((c) => !colIndex.has(c));
  if (missing.length) {
    return {
      ok: false,
      fileError: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Expected: ${IMPORT_COLUMNS.join(", ")}. Download the template to get the exact headers.`,
    };
  }
  const ignoredColumns = headers.filter((h) => h && !(IMPORT_COLUMNS as readonly string[]).includes(h));

  const rows: ImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const cells = grid[i];
    const values = Object.fromEntries(
      IMPORT_COLUMNS.map((c) => [c, colIndex.has(c) ? String(cells[colIndex.get(c)!] ?? "").trim() : ""])
    ) as Record<ImportColumn, string>;
    if (Object.values(values).every((v) => v === "")) continue; // skip fully blank rows
    values.phone_number = fixPhone(values.phone_number);
    rows.push({ rowNumber: i + 1, values, errors: [] });
  }

  if (rows.length === 0) return { ok: false, fileError: "No student rows found under the header." };
  if (rows.length > MAX_IMPORT_ROWS) return { ok: false, fileError: `Too many rows (${rows.length}). Split the file into batches of ${MAX_IMPORT_ROWS}.` };

  for (const row of rows) {
    const parsed = parseStudentInput({
      name: row.values.name,
      fatherName: row.values.father_name,
      className: row.values.class,
      phoneNumber: row.values.phone_number,
      monthlyFee: row.values.monthly_fee,
      admissionFee: row.values.admission_fee,
    });
    if (parsed.ok) {
      row.data = parsed.data;
    } else {
      for (const col of IMPORT_COLUMNS) {
        const msg = parsed.fields[FIELD_FOR[col]];
        if (msg) row.errors.push(`${col}: ${msg}`);
      }
    }
  }

  return { ok: true, rows, ignoredColumns };
}

// Same child listed twice in the file, or already in the DB -> flag instead of creating a duplicate.
// Matched on name + father's name (case-insensitive), which is what staff use to tell students apart.
export const duplicateKey = (name: string, fatherName: string) =>
  `${name.trim().toLowerCase().replace(/\s+/g, " ")}|${fatherName.trim().toLowerCase().replace(/\s+/g, " ")}`;

export function markDuplicates(rows: ImportRow[], existingKeys: Set<string>) {
  const firstRowForKey = new Map<string, number>();
  for (const row of rows) {
    if (!row.data) continue;
    const key = duplicateKey(row.data.name, row.data.fatherName);
    if (existingKeys.has(key)) {
      row.errors.push("Already exists: a student with this name and father's name is already in the system.");
      row.data = undefined;
    } else if (firstRowForKey.has(key)) {
      row.errors.push(`Duplicate of row ${firstRowForKey.get(key)} in this file.`);
      row.data = undefined;
    } else {
      firstRowForKey.set(key, row.rowNumber);
    }
  }
}
