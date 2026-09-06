"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/lib/auth-client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Complaints" },
  { href: "/dashboard/units", label: "Units" },
  { href: "/dashboard/categories", label: "Categories" },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex w-60 flex-col border-r border-line bg-surface px-4 py-6">
      <Link href="/dashboard" className="font-display text-lg font-extrabold text-foreground">
        Complainara
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
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
  );
}
