import { BicycleEditor } from "@/components/bicycle-management";
import { SideDrawer } from "@/components/side-drawer";

import { deleteBikeAction, updateBikeAction } from "../../actions";
import { getBikeDetail } from "../../[bikeId]/data";

export default async function BicycleDrawerPage({
  params
}: {
  readonly params: Promise<{ bikeId: string }>;
}) {
  const { bikeId } = await params;
  const { bike, rideHistory, statusHistory } = await getBikeDetail(bikeId);

  return (
    <SideDrawer ariaLabel={`Edit bicycle ${bike.model}`}>
      <BicycleEditor
        action={updateBikeAction}
        bike={bike}
        deleteAction={deleteBikeAction}
        mode="edit"
        rideHistory={rideHistory}
        statusHistory={statusHistory}
        variant="drawer"
      />
    </SideDrawer>
  );
}
