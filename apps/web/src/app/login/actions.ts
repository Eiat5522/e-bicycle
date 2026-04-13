"use server";

import { redirect } from "next/navigation";

import { getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { validateLoginForm } from "@/lib/validation";

import { initialLoginFormState, type LoginFormState } from "./login-form-state";

export async function signInAction(
  _previousState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const { errors, values } = validateLoginForm(formData);

  if (errors.email || errors.password) {
    return {
      errors,
      message: "Enter a valid email and password.",
      values
    };
  }

  try {
    getSupabaseConfig();
  } catch (error) {
    return {
      ...initialLoginFormState,
      message: error instanceof Error ? error.message : "Supabase is not configured.",
      values
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(values);

  if (error) {
    return {
      errors: {},
      message: "Email or password is incorrect.",
      values: {
        email: values.email,
        password: ""
      }
    };
  }

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();

    return {
      errors: {},
      message: "Unable to verify your session. Try again.",
      values: {
        email: values.email,
        password: ""
      }
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile?.is_admin) {
    await supabase.auth.signOut();

    return {
      errors: {},
      message: "Admin access is required to use this panel.",
      values: {
        email: values.email,
        password: ""
      }
    };
  }

  redirect("/dashboard");
}
