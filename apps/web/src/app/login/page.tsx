import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { getAuthContext } from "@/lib/auth";

export default async function LoginPage() {
  const context = await getAuthContext();

  if (context?.profile?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
      <LoginForm />
    </main>
  );
}
