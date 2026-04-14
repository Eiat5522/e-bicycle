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
  },
  {
    href: "/bicycles",
    label: "Bicycles"
  }
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-3">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "px-4 py-2 text-sm font-semibold transition",
              isActive
                ? "clay-button clay-button-primary"
                : "clay-button text-[var(--foreground)]"
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
