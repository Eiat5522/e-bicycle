import type { CSSProperties, ReactNode } from "react";

function SkeletonLine({ className = "" }: { readonly className?: string }) {
  return <div aria-hidden="true" className={`dashboard-skeleton rounded-full ${className}`} />;
}

function SkeletonCard({
  className = "",
  children
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className={`clay-inset overflow-hidden border border-[var(--dashboard-dark-border)] ${className}`}>
      {children}
    </div>
  );
}

export default function Loading() {
  return (
    <section
      aria-label="Dashboard loading state"
      className="flex flex-col gap-6"
      style={
        {
          "--dashboard-bg": "rgba(248, 241, 255, 0.76)",
          "--dashboard-panel": "rgba(255, 250, 255, 0.92)",
          "--dashboard-panel-soft": "rgba(240, 231, 255, 0.72)",
          "--dashboard-line": "rgba(209, 193, 238, 0.55)",
          "--dashboard-ink": "var(--clay-text-primary)",
          "--dashboard-ink-muted": "var(--clay-text-secondary)",
          "--dashboard-accent": "var(--clay-accent)",
          "--dashboard-accent-soft": "var(--clay-accent-soft)",
          "--dashboard-highlight": "#d9738c",
          "--dashboard-highlight-soft": "rgba(217, 115, 140, 0.16)",
          "--dashboard-success": "var(--clay-success)",
          "--dashboard-success-soft": "var(--clay-success-soft)",
          "--dashboard-danger": "var(--clay-danger)",
          "--dashboard-danger-soft": "var(--clay-danger-soft)",
          "--dashboard-dark-panel": "rgba(238, 228, 255, 0.78)",
          "--dashboard-dark-border": "rgba(209, 193, 238, 0.55)",
          "--dashboard-dark-text": "var(--clay-text-primary)"
        } as CSSProperties
      }>
      <section className="clay-card-raised overflow-hidden">
        <div className="grid gap-6 border-b border-[var(--dashboard-dark-border)] px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)] lg:px-8 lg:py-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <SkeletonLine className="h-8 w-44" />
              <SkeletonLine className="h-8 w-32" />
            </div>

            <div className="flex flex-col gap-3">
              <SkeletonLine className="h-10 w-72 max-w-full sm:h-12 sm:w-96" />
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-full max-w-2xl" />
                <SkeletonLine className="h-4 w-[92%] max-w-2xl" />
                <SkeletonLine className="h-4 w-[78%] max-w-2xl" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard className="p-4" key={`hero-skeleton-${index}`}>
                  <div className="space-y-3">
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-7 w-24" />
                  </div>
                </SkeletonCard>
              ))}
            </div>
          </div>

          <SkeletonCard className="p-5 sm:p-6">
            <div className="space-y-4">
              <SkeletonLine className="h-3 w-36" />
              <SkeletonLine className="h-8 w-44" />
              <SkeletonLine className="h-4 w-full" />
              <SkeletonLine className="h-4 w-[88%]" />
              <div className="grid gap-3 sm:grid-cols-2">
                <SkeletonCard className="p-4">
                  <div className="space-y-3">
                    <SkeletonLine className="h-3 w-28" />
                    <SkeletonLine className="h-7 w-28" />
                  </div>
                </SkeletonCard>
                <SkeletonCard className="p-4">
                  <div className="space-y-3">
                    <SkeletonLine className="h-3 w-24" />
                    <SkeletonLine className="h-7 w-24" />
                  </div>
                </SkeletonCard>
              </div>
            </div>
          </SkeletonCard>
        </div>

        <section className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 md:grid-cols-2 xl:grid-cols-4 lg:px-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard className="p-4 sm:p-5" key={`summary-skeleton-${index}`}>
              <div className="space-y-3">
                <SkeletonLine className="h-3 w-32" />
                <SkeletonLine className="h-8 w-24" />
                <SkeletonLine className="h-4 w-[85%]" />
              </div>
            </SkeletonCard>
          ))}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <SkeletonCard className="p-5 sm:p-6 lg:p-7">
          <div className="space-y-3">
            <SkeletonLine className="h-3 w-40" />
            <SkeletonLine className="h-8 w-72 max-w-full" />
            <SkeletonLine className="h-4 w-[90%]" />
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonCard className="p-5" key={`threshold-skeleton-${index}`}>
                <div className="space-y-3">
                  <SkeletonLine className="h-3 w-24" />
                  <SkeletonLine className="h-6 w-40 max-w-full" />
                  <SkeletonLine className="h-2 w-full rounded-full" />
                  <SkeletonLine className="h-4 w-[88%]" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonCard>

        <SkeletonCard className="p-5 sm:p-6 lg:p-7">
          <div className="space-y-3">
            <SkeletonLine className="h-3 w-32" />
            <SkeletonLine className="h-8 w-40 max-w-full" />
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonCard className="p-4" key={`fleet-skeleton-${index}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <SkeletonLine className="h-4 w-44 max-w-full" />
                    <SkeletonLine className="h-4 w-64 max-w-full" />
                  </div>
                  <SkeletonLine className="h-7 w-24" />
                </div>
                <div className="mt-4 space-y-2">
                  <SkeletonLine className="h-3 w-28" />
                  <SkeletonLine className="h-2 w-full rounded-full" />
                </div>
              </SkeletonCard>
            ))}
          </div>
        </SkeletonCard>
      </section>
    </section>
  );
}
