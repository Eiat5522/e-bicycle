import { mockRideHistory } from "@glide/api";

import { updateUserAction } from "@/app/(admin)/actions";
import { UserManagementTable } from "@/components/user-management-table";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/auth";

function getSampleRideHistoryForUser(userId: string) {
  const rides = [...mockRideHistory];
  const seed = [...userId].reduce((total, char) => total + char.charCodeAt(0), 0);
  const count = seed % (rides.length + 1);
  const startIndex = rides.length === 0 ? 0 : seed % rides.length;

  if (count === 0) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const ride = rides[(startIndex + index) % rides.length];

    if (!ride) {
      throw new Error("Missing mocked ride history item.");
    }

    return ride;
  });
}

export default async function UsersPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, { data: transactions, error: transactionsError }] =
    await Promise.all([
      supabase
    .from("profiles")
    .select("id, first_name, is_admin, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_transactions")
        .select("id, wallet_id, type, title, subtitle, amount, created_at")
        .order("created_at", { ascending: false })
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  const transactionsByUserId = transactions.reduce<Record<string, typeof transactions>>((accumulator, transaction) => {
    const list = accumulator[transaction.wallet_id] ?? [];
    list.push(transaction);
    accumulator[transaction.wallet_id] = list;

    return accumulator;
  }, {});

  return (
    <UserManagementTable
      onUpdateUser={updateUserAction}
      users={profiles.map((profile) => ({
        id: profile.id,
        firstName: profile.first_name,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        rideHistory: getSampleRideHistoryForUser(profile.id),
        transactions: (transactionsByUserId[profile.id] ?? []).map((transaction) => ({
          id: transaction.id,
          type: transaction.type as Database["public"]["Tables"]["wallet_transactions"]["Row"]["type"],
          title: transaction.title,
          subtitle: transaction.subtitle,
          amount: Number(transaction.amount),
          timestamp: transaction.created_at
        }))
      }))}
    />
  );
}
