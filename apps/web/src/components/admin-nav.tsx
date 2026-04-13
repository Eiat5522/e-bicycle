"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/dashboard",
    label: "Dashboard"
  },
  {
    href: "/users",
    label: "Users"
  }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-3">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "rounded-full px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "bg-[var(--foreground)] text-white"
                : "bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface-strong)]"
            ].join(" ")}
            href={item.href}
            key={item.href}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
