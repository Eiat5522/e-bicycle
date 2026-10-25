import type { Metadata } from "next";

import { AdminDashboard } from "@/components/admin-dashboard";

import { loadDashboardViewModels } from "./dashboard/data";

export const metadata: Metadata = {
  title: "Home | Glide Admin",
  description: "Live admin home for fleet health, ride revenue, and support pressure."
};

export default async function HomePage() {
  const data = await loadDashboardViewModels();

  return <AdminDashboard data={data} />;
}
