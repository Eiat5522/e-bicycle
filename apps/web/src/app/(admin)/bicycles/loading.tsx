import type { ReactNode } from "react";

function SkeletonLine({ className = "" }: { readonly className?: string }) {
  return <div aria-hidden="true" className={`dashboard-skeleton rounded-full ${className}`} />;
}

function SkeletonCard({
  className = "",
  children
}: {
  readonly className?: string;
  readonly children?: ReactNode;
}) {
  return <div className={`clay-inset overflow-hidden ${className}`}>{children}</div>;
}

export default function Loading() {
  return (
    <section aria-label="Bicycle management loading state" className="flex flex-col gap-6">
      <div className="clay-card-raised flex flex-col gap-4 p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-3xl flex-col gap-4">
          <SkeletonLine className="h-4 w-48" />
          <SkeletonLine className="h-11 w-full max-w-2xl" />
          <div className="space-y-2">
            <SkeletonLine className="h-4 w-full max-w-2xl" />
            <SkeletonLine className="h-4 w-[78%] max-w-2xl" />
          </div>
        </div>
        <SkeletonLine className="h-12 w-32" />
      </div>

      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <article
            className="clay-card grid gap-5 p-6 md:grid-cols-[180px_minmax(0,1fr)_auto]"
            key={`bicycle-loading-${index}`}>
            <SkeletonCard className="min-h-44 rounded-[1.5rem]" />

            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <SkeletonLine className="h-8 w-48 max-w-full" />
                <SkeletonLine className="h-7 w-28" />
              </div>
              <div className="space-y-2">
                <SkeletonLine className="h-4 w-full max-w-lg" />
                <SkeletonLine className="h-4 w-[72%] max-w-md" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 3 }).map((__, metricIndex) => (
                  <div className="space-y-2" key={`bicycle-loading-${index}-metric-${metricIndex}`}>
                    <SkeletonLine className="h-4 w-24" />
                    <SkeletonLine className="h-3 w-28" />
                  </div>
                ))}
              </div>
              <SkeletonLine className="h-4 w-72 max-w-full" />
            </div>

            <div className="flex items-start justify-start md:justify-end">
              <SkeletonLine className="h-12 w-28" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
