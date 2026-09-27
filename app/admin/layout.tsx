import AppShell, { type NavLink } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";

const links: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/managers", label: "Managers", icon: "users" },
  { href: "/admin/students", label: "Students", icon: "students" },
  { href: "/admin/submissions", label: "Submissions", icon: "inbox" },
  { href: "/admin/expenses", label: "Expenses", icon: "receipt" },
  { href: "/admin/reports", label: "Reports", icon: "chart" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("ADMIN");
  return (
    <AppShell areaLabel="Admin" homeHref="/admin" links={links} userName={session.name}>
      {children}
    </AppShell>
  );
}
