import { BicycleEditor } from "@/components/bicycle-management";
import { requireAdmin } from "@/lib/auth";

import { createBikeAction } from "../actions";

export default async function NewBicyclePage() {
  await requireAdmin();

  return (
    <BicycleEditor
      action={createBikeAction}
      bike={{
        createdAt: new Date().toISOString(),
        activeRiderId: null,
        activeRiderLabel: null,
        id: "",
        imageUrl: null,
        lastReportedAt: new Date().toISOString(),
        latitude: 13.7563,
        location: "",
        longitude: 100.5018,
        model: "",
        pricingLabel: "$1.00 / 10 min",
        ratePerMinute: 0.1,
        rideClass: "",
        status: "available",
        topSpeedKmh: 25,
        updatedAt: new Date().toISOString()
      }}
      mode="create"
      rideHistory={[]}
    />
  );
}
