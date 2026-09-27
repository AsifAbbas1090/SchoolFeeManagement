import Link from "next/link";
import { PageHeader } from "@/components/ui";
import AddManagerForm from "./AddManagerForm";

export const metadata = { title: "Add Manager · Admin" };

export default function NewManagerPage() {
  return (
    <>
      <PageHeader
        title="Add Manager"
        subtitle="Creates a login for a new fee collector"
        action={
          <Link href="/admin/managers" className="text-sm text-muted hover:text-foreground">
            ← Back to managers
          </Link>
        }
      />
      <AddManagerForm />
    </>
  );
}
