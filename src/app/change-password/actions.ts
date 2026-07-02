"use server";

import { redirect } from "next/navigation";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { logAuditAction } from "@/lib/audit";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

export type ChangePasswordState = {
  message?: string;
};

function isValidPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

export async function changePassword(
  _: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    redirect("/login");
  }

  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { message: "Completa todos los campos." };
  }

  if (!isValidPassword(newPassword)) {
    return {
      message:
        "La nueva contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula y un numero."
    };
  }

  if (newPassword !== confirmPassword) {
    return { message: "La nueva contrasena y la confirmacion no coinciden." };
  }

  if (!profile.email) {
    return { message: "No se pudo validar la cuenta. Vuelve a iniciar sesion." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: currentPassword
  });

  if (signInError) {
    return { message: "La contrasena actual no es correcta." };
  }

  const { error: updatePasswordError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updatePasswordError) {
    return { message: "No se pudo actualizar la contrasena. Intentalo de nuevo." };
  }

  const supabaseAdmin = createAdminClient();
  const { error: updateProfileError } = await supabaseAdmin
    .from("profiles")
    .update({ must_change_password: false } as never)
    .eq("id", profile.id);

  if (updateProfileError) {
    return { message: "La contrasena se actualizo, pero no se pudo completar el primer acceso." };
  }

  await logAuditAction({
    actorUserId: profile.id,
    actorRole: profile.role,
    action: "password_changed",
    module: "auth",
    entityType: "profile",
    entityId: profile.id,
    afterData: {
      first_login_completed: profile.must_change_password
    }
  });

  redirect(withToast(getDashboardPathForRole(profile.role), "success", "Contrasena actualizada correctamente."));
}
