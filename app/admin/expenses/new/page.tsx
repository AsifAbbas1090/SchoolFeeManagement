import Link from "next/link";
import { dayKey } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import ExpenseForm from "@/components/ExpenseForm";

export const metadata = { title: "Add Expense · Admin" };
export const dynamic = "force-dynamic";

export default function NewExpensePage() {
  return (
    <>
      <Link href="/admin/expenses" className="mb-3 inline-block text-sm text-muted hover:text-foreground">← All expenses</Link>
      <PageHeader title="Add expense" />
      <ExpenseForm
        method="POST"
        action="/api/admin/expenses"
        redirectTo="/admin/expenses"
        submitLabel="Add expense"
        initial={{ title: "", category: "Other", amount: "", expenseDate: dayKey(), notes: "" }}
      />
    </>
  );
}
