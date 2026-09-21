"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, logout } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth-client";

type NavItem = { href: string; label: string; roles?: string[] };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Complaints" },
  { href: "/dashboard/complaints/new", label: "File a complaint", roles: ["COMPLAINANT"] },
  { href: "/dashboard/units", label: "Units", roles: ["ORG_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/categories", label: "Categories", roles: ["ORG_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/users", label: "Users", roles: ["ORG_ADMIN", "SUPER_ADMIN"] },
  { href: "/dashboard/settings", label: "Settings", roles: ["ORG_ADMIN"] },
];

function filterNavByRole(items: NavItem[], role: string): NavItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, []);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const role = session?.role ?? "COMPLAINANT";
  const visibleItems = filterNavByRole(NAV_ITEMS, role);

  return (
    <>
      {/* Mobile hamburger (hidden while the sidebar is open) */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-foreground md:hidden"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-line bg-surface px-4 py-6 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-foreground md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <Link href="/dashboard" className="font-display text-lg font-extrabold text-foreground">
            Complainara
          </Link>
        </div>

        {/* Role badge */}
        <div className="mt-3">
          <span className="inline-block rounded-full bg-teal/10 px-2.5 py-0.5 font-mono text-xs text-teal">
            {role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {visibleItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard" || pathname.startsWith("/dashboard/complaints")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-teal/10 text-teal"
                    : "text-muted hover:bg-bg hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto rounded-lg px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-bg hover:text-stamp"
        >
          Log out
        </button>
      </aside>
    </>
  );
}
