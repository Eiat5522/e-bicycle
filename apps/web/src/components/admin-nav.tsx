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
    <nav aria-label="Admin sections" className="clay-admin-tabs">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={[
              "clay-admin-tab",
              isActive
                ? "clay-admin-tab-active"
                : "clay-admin-tab-inactive"
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
