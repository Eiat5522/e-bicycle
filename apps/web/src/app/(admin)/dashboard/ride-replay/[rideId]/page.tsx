import type { Metadata } from "next";

import { RideReplayDetail } from "@/components/ride-replay-detail";

import { getRideReplayDetail } from "./data";

export const metadata: Metadata = {
  title: "Ride Replay",
  description: "Completed ride route, checkpoint, fare, and drop-off replay."
};

export default async function RideReplayPage({
  params
}: {
  readonly params: Promise<{ rideId: string }>;
}) {
  const { rideId } = await params;
  const replay = await getRideReplayDetail(rideId);

  return <RideReplayDetail replay={replay} />;
}
