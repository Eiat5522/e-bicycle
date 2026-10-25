"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { useRouter } from "next/navigation";

export function DrawerCloseButton({
  children,
  className = "",
  label = "Close drawer"
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly label?: string;
}) {
  const router = useRouter();

  return (
    <button
      aria-label={label}
      className={className}
      onClick={() => router.back()}
      type="button">
      {children}
    </button>
  );
}

export function SideDrawer({
  ariaLabel,
  children
}: {
  readonly ariaLabel: string;
  readonly children: ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.back();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return (
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[2px]"
      role="dialog">
      <button
        aria-label="Close drawer"
        className="flex-1"
        onClick={() => router.back()}
        type="button"
      />

      <aside className="clay-card-raised flex h-full w-full max-w-5xl flex-col overflow-y-auto rounded-none border-l border-[var(--clay-border-subtle)] shadow-[-20px_0_60px_rgba(103,74,153,0.18)]">
        {children}
      </aside>
    </div>
  );
}
