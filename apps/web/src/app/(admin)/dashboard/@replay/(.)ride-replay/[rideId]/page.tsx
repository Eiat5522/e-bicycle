import { RideReplayDetail } from "@/components/ride-replay-detail";
import { SideDrawer } from "@/components/side-drawer";
import { getRideReplayDetail } from "@/app/(admin)/dashboard/ride-replay/[rideId]/data";

export default async function RideReplayDrawerPage({
  params
}: {
  readonly params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;
  const replay = await getRideReplayDetail(rideId);

  return (
    <SideDrawer ariaLabel={`Ride replay for ${replay.routeLabel}`}>
      <RideReplayDetail replay={replay} variant="drawer" />
    </SideDrawer>
  );
}
