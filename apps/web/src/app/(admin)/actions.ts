"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isMissingAuthSessionError } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/server";
import { validateProfileUpdateForm } from "@/lib/validation";

async function requireAdminForAction() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (isMissingAuthSessionError(userError) || !user) {
    redirect("/login");
  }

  if (userError) {
    throw new Error(userError.message);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    redirect("/login");
  }

  return supabase;
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateUserAction(formData: FormData) {
  const supabase = await requireAdminForAction();
  const values = validateProfileUpdateForm(formData);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.firstName,
      is_admin: values.isAdmin
    })
    .eq("id", values.userId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/users");
}
