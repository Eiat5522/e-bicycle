import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";

export const metadata: Metadata = {
  title: "Executive Dashboard",
  description: "Live executive overview for fleet health, ride revenue, and support pressure."
};

export default function DashboardPage() {
  return <AdminShell />;
}
