import { AdminShell } from "@/components/admin-shell";
import { ExecutiveScorecard } from "@/components/executive-scorecard";
import { OperationsDashboard } from "@/components/operations-dashboard";

import type { DashboardViewModels } from "@/app/(admin)/dashboard/data";

interface AdminDashboardProps {
  readonly data: DashboardViewModels;
}

export function AdminDashboard({ data }: AdminDashboardProps) {
  return (
    <AdminShell
      executiveDashboard={<ExecutiveScorecard data={data.executive} />}
      operationsDashboard={<OperationsDashboard data={data.operations} />}
    />
  );
}
