import { BicycleEditor } from "@/components/bicycle-management";

import { deleteBikeAction, updateBikeAction } from "../actions";
import { getBikeDetail } from "./data";

export default async function BicycleDetailPage({
  params
}: {
  readonly params: Promise<{ bikeId: string }>;
}) {
  const { bikeId } = await params;
  const { bike, rideHistory } = await getBikeDetail(bikeId);

  return (
    <BicycleEditor
      action={updateBikeAction}
      bike={bike}
      deleteAction={deleteBikeAction}
      mode="edit"
      rideHistory={rideHistory}
    />
  );
}
