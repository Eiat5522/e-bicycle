import { redirect } from "next/navigation";

import { formatAdminDate } from "@/lib/formatting";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { ProfileRow } from "@/lib/supabase/database.types";

export interface AdminProfile {
  readonly id: string;
  readonly firstName: string;
  readonly isAdmin: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthContext {
  readonly user: {
    readonly id: string;
    readonly email: string | null;
  };
  readonly profile: AdminProfile | null;
}

export interface AdminContext extends AuthContext {
  readonly profile: AdminProfile;
}

function mapProfile(row: ProfileRow): AdminProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function fetchProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, is_admin, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfile(data) : null;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!hasSupabaseConfig) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email ?? null
    },
    profile: await fetchProfile(user.id)
  };
}

export async function requireAdmin(): Promise<AdminContext> {
  const context = await getAuthContext();

  if (!context?.profile?.isAdmin) {
    redirect("/login");
  }

  return {
    ...context,
    profile: context.profile
  };
}

export { formatAdminDate };
