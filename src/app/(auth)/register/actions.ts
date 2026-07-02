"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/roles";

export type RegisterState = {
  message?: string;
  success?: boolean;
};

export async function register(
  _: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "family");
  const role: Role = requestedRole === "director" || requestedRole === "tutor" ? requestedRole : "family";

  if (!email || !password || !fullName) {
    return { message: "Completa nombre, email y contraseña." };
  }

  if (!email.includes("@")) {
    return { message: "Introduce un email válido." };
  }

  if (password.length < 8) {
    return { message: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (hasSupabaseAdminClient()) {
    return createConfirmedUser({ email, password, fullName, role });
  }

  return createUserWithPublicSignup({ email, password, fullName, role });
}

async function createConfirmedUser({
  email,
  password,
  fullName,
  role
}: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}): Promise<RegisterState> {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role
    }
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { message: "Ya existe una cuenta con ese email." };
    }

    return { message: `No se pudo crear la cuenta: ${error.message}` };
  }

  return {
    success: true,
    message: "Cuenta creada correctamente. Ya puedes iniciar sesión."
  };
}

async function createUserWithPublicSignup({
  email,
  password,
  fullName,
  role
}: {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}): Promise<RegisterState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role
      }
    }
  });

  if (error) {
    if (error.status === 429) {
      return {
        message:
          "Supabase ha limitado temporalmente los registros. Configura SUPABASE_SERVICE_ROLE_KEY para crear usuarios de prueba desde el servidor sin ese bloqueo."
      };
    }

    return { message: `No se pudo crear la cuenta: ${error.message}` };
  }

  if (!data.session) {
    return {
      success: true,
      message: "Cuenta creada. Revisa el email para confirmar el acceso antes de iniciar sesión."
    };
  }

  return {
    success: true,
    message: "Cuenta creada correctamente. Ya puedes iniciar sesión."
  };
}
