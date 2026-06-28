import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
  replay
}: {
  readonly children: ReactNode;
  readonly replay: ReactNode;
}) {
  return (
    <>
      {children}
      {replay}
    </>
  );
}
