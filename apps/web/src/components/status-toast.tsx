"use client";

export function StatusToast({
  message
}: {
  readonly message: string;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed right-6 top-6 z-[60] max-w-sm rounded-[1.5rem] border border-[var(--clay-success)] bg-[var(--clay-success-soft)] px-5 py-4 text-sm font-semibold text-[var(--clay-success)] shadow-[0_18px_48px_rgba(30,136,84,0.18)]"
      role="status">
      {message}
    </div>
  );
}
