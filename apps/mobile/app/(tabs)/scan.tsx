import { Redirect } from "expo-router";

import { SCAN_TAB_UNLOCK_HREF } from "@/navigation/scan-tab";

export default function ScanRoute() {
  return <Redirect href={SCAN_TAB_UNLOCK_HREF} />;
}
