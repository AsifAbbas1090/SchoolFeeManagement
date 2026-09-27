"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import Icon, { type IconName } from "@/components/icons";

export type NavLink = { href: string; label: string; icon: IconName };

// Logo mark: emerald tile with a rupee sign.
function Brand({ areaLabel }: { areaLabel: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-strong text-base font-bold text-accent-fg" aria-hidden="true">₨</span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">School Fee System</span>
        <span className="block text-xs text-muted">{areaLabel}</span>
      </span>
    </span>
  );
}

type Props = {
  areaLabel: string; // "Admin" | "Management"
  homeHref: string; // "/admin" | "/manager"
  links: NavLink[];
  userName: string;
  children: React.ReactNode;
};

// Desktop (md+): fixed sidebar. Phones: top bar with a hamburger that opens the same links.
export default function AppShell({ areaLabel, homeHref, links, userName, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const isActive = (href: string) =>
    href === homeHref ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  // Close the phone menu on navigation, Escape, or a tap outside it.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const navItems = (className: string) =>
    links.map((l) => (
      <Link
        key={l.href}
        href={l.href}
        aria-current={isActive(l.href) ? "page" : undefined}
        className={`${className} relative flex items-center gap-3 rounded-lg px-3 text-sm transition-colors ${
          isActive(l.href)
            ? "bg-accent-soft font-semibold text-accent before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent-strong"
            : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground"
        }`}
      >
        <Icon name={l.icon} size={17} />
        {l.label}
      </Link>
    ));

  return (
    <div className="min-h-screen md:flex">
      {/* ---------- Phone header ---------- */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface md:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <Link href={homeHref} className="min-w-0">
            <Brand areaLabel={areaLabel} />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-black/5 dark:hover:bg-white/10"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div ref={menuRef} id="mobile-menu" className="border-t border-border px-2 pb-3 pt-2 shadow-lg">
            <nav className="flex flex-col gap-1" aria-label="Main">
              {navItems("block py-2.5")}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-border px-3 pt-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted">{areaLabel}</p>
              </div>
              <LogoutButton />
            </div>
          </div>
        )}
      </header>

      {/* ---------- Desktop sidebar ---------- */}
      <aside className="hidden border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col">
        <Link href={homeHref} className="px-4 py-5">
          <Brand areaLabel={areaLabel} />
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Main">
          {navItems("py-2")}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold" aria-hidden="true">
              {userName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium">{userName}</span>
              <span className="block text-xs text-muted">{areaLabel}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
