import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EXPENSE_CATEGORIES } from "@/lib/expenseInput";
import { toDateInput } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import ExpenseForm from "@/components/ExpenseForm";

export const metadata = { title: "Edit Expense · Admin" };
export const dynamic = "force-dynamic";

export default async function EditExpensePage({ params }: { params: { id: string } }) {
  const e = await prisma.expense.findUnique({ where: { id: params.id } });
  if (!e) notFound();
  const category = (EXPENSE_CATEGORIES as readonly string[]).includes(e.category ?? "") ? e.category! : "Other";

  return (
    <>
      <Link href="/admin/expenses" className="mb-3 inline-block text-sm text-muted hover:text-foreground">← All expenses</Link>
      <PageHeader title="Edit expense" />
      <ExpenseForm
        method="PATCH"
        action={`/api/admin/expenses/${e.id}`}
        redirectTo="/admin/expenses"
        submitLabel="Save changes"
        initial={{ title: e.title, category, amount: String(e.amount), expenseDate: toDateInput(e.expenseDate), notes: e.notes ?? "" }}
      />
    </>
  );
}
