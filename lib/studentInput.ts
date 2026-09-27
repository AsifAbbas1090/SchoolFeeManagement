// Validation for student create/edit payloads. Pure — safe to import on client or server.

import { startOfDay } from "@/lib/time";

export type StudentInput = {
  name: string;
  fatherName: string;
  className: string;
  phoneNumber: string;
  monthlyFee: number;
  admissionFee: number | null;
  admissionDate: Date | null;
};

export type StudentFieldErrors = Partial<Record<keyof StudentInput, string>>;

const MAX_FEE = 10_000_000;
export const MAX_CLASS_LENGTH = 50;

// Free text, but trimmed with inner whitespace collapsed so "Class  5" and "Class 5" group together.
export function normalizeClassName(v: unknown): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
}

function parseRupees(v: unknown): number | null | "invalid" {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
  if (!Number.isInteger(n) || n < 0 || n > MAX_FEE) return "invalid";
  return n;
}

export function parseStudentInput(
  body: Record<string, unknown>
): { ok: true; data: StudentInput } | { ok: false; fields: StudentFieldErrors } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fields: StudentFieldErrors = {};

  const name = str(body.name);
  const fatherName = str(body.fatherName);
  const className = normalizeClassName(body.className);
  const phoneNumber = str(body.phoneNumber);
  if (!name) fields.name = "Student name is required.";
  else if (name.length > 100) fields.name = "Name is too long.";
  if (!fatherName) fields.fatherName = "Father's name is required.";
  else if (fatherName.length > 100) fields.fatherName = "Name is too long.";
  if (!className) fields.className = "Class is required.";
  else if (className.length > MAX_CLASS_LENGTH) fields.className = `Class must be ${MAX_CLASS_LENGTH} characters or fewer.`;
  if (!phoneNumber) fields.phoneNumber = "Phone number is required.";
  else if (!/^[0-9+\-\s()]{7,20}$/.test(phoneNumber)) fields.phoneNumber = "Enter a valid phone number.";

  const monthly = parseRupees(body.monthlyFee);
  if (monthly === null) fields.monthlyFee = "Monthly fee is required.";
  else if (monthly === "invalid") fields.monthlyFee = "Enter a whole rupee amount (0 or more).";

  const admission = parseRupees(body.admissionFee);
  if (admission === "invalid") fields.admissionFee = "Enter a whole rupee amount, or leave blank.";

  let admissionDate: Date | null = null;
  const rawDate = str(body.admissionDate);
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate))) {
      fields.admissionDate = "Enter a valid date.";
    } else {
      admissionDate = startOfDay(rawDate);
    }
  }

  if (Object.keys(fields).length) return { ok: false, fields };
  return {
    ok: true,
    data: {
      name,
      fatherName,
      className,
      phoneNumber,
      monthlyFee: monthly as number,
      admissionFee: admission as number | null,
      admissionDate,
    },
  };
}
