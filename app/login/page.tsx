import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homePathFor } from "@/lib/session";
import LoginForm from "./LoginForm";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata = { title: "Sign in · School Fee System" };

export default async function LoginPage() {
  // Already signed in? Skip the form.
  const session = await getSession();
  if (session) redirect(homePathFor(session.role));

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,rgb(var(--accent-strong)/0.16),transparent)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-strong text-2xl font-bold text-accent-fg shadow-lg shadow-accent-strong/30" aria-hidden="true">₨</span>
          <h1 className="text-2xl font-semibold tracking-tight">School Fee System</h1>
          <p className="mt-1 text-sm text-muted">Sign in to continue</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
