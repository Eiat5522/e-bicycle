"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isMissingAuthSessionError } from "@/lib/supabase/auth-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateProfileUpdateForm, validateUserCreateForm } from "@/lib/validation";

import {
  initialUserCreateFormState,
  type UserCreateFormState
} from "./user-create-form-state";
import {
  initialUserUpdateFormState,
  type UserUpdateFormState
} from "./user-update-form-state";

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

export async function createUserAction(
  _previousState: UserCreateFormState,
  formData: FormData
): Promise<UserCreateFormState> {
  await requireAdminForAction();

  try {
    const values = validateUserCreateForm(formData);
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: values.email,
      email_confirm: true,
      password: values.password,
      user_metadata: {
        first_name: values.firstName
      }
    });

    if (error) {
      return {
        message: error.message,
        status: "error"
      };
    }

    if (!data.user) {
      return {
        message: "Supabase did not return the created user.",
        status: "error"
      };
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_admin: values.isAdmin
      })
      .eq("id", data.user.id);

    if (profileError) {
      return {
        message: profileError.message,
        status: "error"
      };
    }
  } catch (error) {
    return {
      ...initialUserCreateFormState,
      message: error instanceof Error ? error.message : "Unable to create this user.",
      status: "error"
    };
  }

  revalidatePath("/users");

  return {
    message: "User created successfully.",
    status: "success"
  };
}

export async function updateUserAction(
  _previousState: UserUpdateFormState,
  formData: FormData
): Promise<UserUpdateFormState> {
  const supabase = await requireAdminForAction();

  try {
    const values = validateProfileUpdateForm(formData);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: values.firstName,
        is_admin: values.isAdmin
      })
      .eq("id", values.userId);

    if (error) {
      return {
        message: error.message,
        status: "error"
      };
    }
  } catch (error) {
    return {
      ...initialUserUpdateFormState,
      message: error instanceof Error ? error.message : "Unable to update this user.",
      status: "error"
    };
  }

  revalidatePath("/users");

  return {
    ...initialUserUpdateFormState,
    status: "success"
  };
}
