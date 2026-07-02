"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";

export type LoginState = {
  message?: string;
};

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Introduce email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { message: "No se pudo iniciar sesión con esas credenciales." };
  }

  const profile = await getCurrentUserProfile();
  if (profile?.must_change_password) {
    redirect("/change-password");
  }

  redirect(getDashboardPathForRole(profile?.role ?? "family"));
}
