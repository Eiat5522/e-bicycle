import { UserManagementTable } from "@/components/user-management-table";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export default async function UsersPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, is_admin, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <UserManagementTable
      users={data.map((profile) => ({
        id: profile.id,
        firstName: profile.first_name,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }))}
    />
  );
}
