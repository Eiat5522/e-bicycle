import type { Metadata } from "next";

import { AdminShell } from "@/components/admin-shell";
import { ExecutiveScorecard } from "@/components/executive-scorecard";
import { OperationsDashboard } from "@/components/operations-dashboard";

import { loadDashboardViewModels } from "./data";

export const metadata: Metadata = {
  title: "Executive Dashboard",
  description: "Live executive overview for fleet health, ride revenue, and support pressure."
};

export default async function DashboardPage() {
  const data = await loadDashboardViewModels();

  return (
    <AdminShell
      executiveDashboard={<ExecutiveScorecard data={data.executive} />}
      operationsDashboard={<OperationsDashboard data={data.operations} />}
    />
  );
}
