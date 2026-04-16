import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";

const tabCards = [
  {
    href: "/dashboard",
    title: "Dashboard",
    description: "Track live fleet KPIs, support load, and revenue momentum.",
    imageSrc: "/images/tabs/dashboard.svg",
    imageAlt: "Analytics widgets and charts"
  },
  {
    href: "/users",
    title: "Users",
    description: "Review riders and staff accounts, activity, and account health.",
    imageSrc: "/images/tabs/users.svg",
    imageAlt: "People cards and user directory"
  },
  {
    href: "/bicycles",
    title: "Bicycles",
    description: "Manage bike inventory, condition status, and assignment workflow.",
    imageSrc: "/images/tabs/bicycles.svg",
    imageAlt: "Electric bikes and maintenance checklist"
  }
] as const;

export default async function HomePage() {
  const context = await requireAdmin();

  return (
    <main className="clay-shell mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="clay-card-raised overflow-hidden p-8 md:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div className="space-y-5">
            <span className="clay-badge inline-flex px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--clay-accent-strong)]">
              Glide admin home
            </span>
            <h1 className="text-4xl font-black tracking-[-0.06em] text-[var(--foreground)] md:text-5xl">
              Welcome back, {context.profile.firstName}.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[var(--foreground-muted)] md:text-lg">
              Jump to any admin tab in one click. This home view keeps your primary workflows in
              reach with a visual Bento grid.
            </p>
          </div>

          <div className="clay-inset h-full p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--clay-text-tertiary)]">
              Signed in as
            </p>
            <p className="mt-3 text-lg font-bold text-[var(--foreground)]">
              {context.user.email ?? "admin user"}
            </p>
            <p className="mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
              Use the shortcuts below to move between dashboard analytics, user management, and
              bicycle operations.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Primary admin navigation" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tabCards.map((tabCard) => (
          <Link className="clay-home-card group" href={tabCard.href} key={tabCard.href}>
            <div className="relative h-44 w-full overflow-hidden rounded-[calc(var(--clay-radius-md)-2px)] border border-[var(--clay-border)] bg-white/55">
              <Image
                alt={tabCard.imageAlt}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                src={tabCard.imageSrc}
              />
            </div>
            <div className="space-y-2 px-1 py-1">
              <h2 className="text-2xl font-black tracking-[-0.04em] text-[var(--foreground)]">
                {tabCard.title}
              </h2>
              <p className="text-sm leading-7 text-[var(--foreground-muted)]">{tabCard.description}</p>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
