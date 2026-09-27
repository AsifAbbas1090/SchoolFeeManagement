"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="h-8 rounded-md border border-border px-3 text-sm hover:bg-black/5 dark:hover:bg-white/10"
    >
      Log out
    </button>
  );
}
