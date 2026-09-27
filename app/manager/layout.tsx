import AppShell, { type NavLink } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";

// Deliberately separate from the admin nav — managers never see admin links.
const links: NavLink[] = [
  { href: "/manager", label: "Dashboard", icon: "dashboard" },
  { href: "/manager/payments/new", label: "Record Payment", icon: "coins" },
  { href: "/manager/students", label: "Students", icon: "students" },
  { href: "/manager/submit", label: "Submit to Admin", icon: "send" },
];

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("MANAGER");
  return (
    <AppShell areaLabel="Management" homeHref="/manager" links={links} userName={session.name}>
      {children}
    </AppShell>
  );
}
