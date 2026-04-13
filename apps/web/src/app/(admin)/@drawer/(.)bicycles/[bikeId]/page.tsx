import { BicycleEditor } from "@/components/bicycle-management";
import { SideDrawer } from "@/components/side-drawer";

import { deleteBikeAction, updateBikeAction } from "../../../bicycles/actions";
import { getBikeDetail } from "../../../bicycles/[bikeId]/data";

export default async function BicycleDrawerPage({
  params
}: {
  readonly params: Promise<{ bikeId: string }>;
}) {
  const { bikeId } = await params;
  const { bike, rideHistory } = await getBikeDetail(bikeId);

  return (
    <SideDrawer ariaLabel={`Edit bicycle ${bike.model}`}>
      <BicycleEditor
        action={updateBikeAction}
        bike={bike}
        deleteAction={deleteBikeAction}
        mode="edit"
        rideHistory={rideHistory}
        variant="drawer"
      />
    </SideDrawer>
  );
}
