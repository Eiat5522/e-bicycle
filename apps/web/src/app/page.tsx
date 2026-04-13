import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";

export default async function Home() {
  const context = await getAuthContext();

  redirect(context?.profile?.isAdmin ? "/dashboard" : "/login");
}
