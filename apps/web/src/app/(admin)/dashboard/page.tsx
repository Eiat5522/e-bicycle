import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin-dashboard";

import { loadDashboardViewModels } from "./data";

export const metadata: Metadata = {
  title: "Executive Dashboard",
  description: "Live executive overview for fleet health, ride revenue, and support pressure."
};

export default async function DashboardPage() {
  const data = await loadDashboardViewModels();

  return <AdminDashboard data={data} />;
}
