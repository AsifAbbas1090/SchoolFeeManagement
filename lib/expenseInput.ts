// Validation for expense create/edit. Pure — safe on client or server.
import { startOfDay } from "@/lib/time";

export const EXPENSE_CATEGORIES = ["Utilities", "Salary", "Supplies", "Maintenance", "Other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export type ExpenseInput = { title: string; category: ExpenseCategory; amount: number; expenseDate: Date; notes: string | null };
export type ExpenseFieldErrors = Partial<Record<keyof ExpenseInput, string>>;

const MAX_AMOUNT = 100_000_000;

export function parseExpenseInput(
  body: Record<string, unknown>
): { ok: true; data: ExpenseInput } | { ok: false; fields: ExpenseFieldErrors } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fields: ExpenseFieldErrors = {};

  const title = str(body.title);
  if (!title) fields.title = "Title is required.";
  else if (title.length > 100) fields.title = "Title must be 100 characters or fewer.";

  const category = str(body.category) as ExpenseCategory;
  if (!EXPENSE_CATEGORIES.includes(category)) fields.category = "Choose a category.";

  const rawAmount = typeof body.amount === "number" ? body.amount : Number(str(body.amount).replace(/,/g, ""));
  if (!Number.isInteger(rawAmount) || rawAmount <= 0) fields.amount = "Enter a whole rupee amount greater than 0.";
  else if (rawAmount > MAX_AMOUNT) fields.amount = "Amount is too large.";

  const rawDate = str(body.expenseDate);
  let expenseDate: Date | null = null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(Date.parse(rawDate))) fields.expenseDate = "Enter a valid date.";
  else expenseDate = startOfDay(rawDate);

  const notes = str(body.notes);
  if (notes.length > 200) fields.notes = "Notes must be 200 characters or fewer.";

  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, data: { title, category, amount: rawAmount, expenseDate: expenseDate!, notes: notes || null } };
}
