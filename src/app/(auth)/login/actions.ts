"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import {
  ACTIVE_SCHOOL_COOKIE_MAX_AGE,
  ACTIVE_SCHOOL_COOKIE_NAME,
  getUserSchoolMemberships,
  resolveActiveSchoolContext,
  SchoolContextError
} from "@/lib/schools/context";
import { getPublicSchoolBySlug } from "@/lib/schools/public-schools";

export type LoginState = {
  message?: string;
};

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const selectedSchool = getPublicSchoolBySlug(String(formData.get("school") ?? ""));

  if (!selectedSchool) {
    return { message: "Selecciona un centro válido antes de iniciar sesión." };
  }

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
  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    return { message: "La cuenta no tiene un perfil activo configurado." };
  }

  try {
    const { memberships, schemaAvailable } = await getUserSchoolMemberships(profile.id);
    if (!schemaAvailable) {
      throw new SchoolContextError(
        "La infraestructura multitenant no está disponible.",
        "SCHOOL_CONTEXT_UNAVAILABLE"
      );
    }

    const selectedMembership = memberships.find(
      (membership) => membership.school.slug === selectedSchool.slug
    );
    if (!selectedMembership) {
      await supabase.auth.signOut();
      cookies().delete(ACTIVE_SCHOOL_COOKIE_NAME);
      return { message: "Esta cuenta no tiene acceso al centro seleccionado." };
    }

    const context = resolveActiveSchoolContext({
      profile,
      memberships,
      requestedSchoolId: selectedMembership.school_id
    });

    cookies().set(ACTIVE_SCHOOL_COOKIE_NAME, context.schoolId!, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACTIVE_SCHOOL_COOKIE_MAX_AGE
    });

    if (profile.must_change_password) {
      redirect("/change-password");
    }

    redirect(getDashboardPathForRole(context.role));
  } catch (error) {
    if (error instanceof SchoolContextError) {
      await supabase.auth.signOut();
      cookies().delete(ACTIVE_SCHOOL_COOKIE_NAME);
      return { message: "Esta cuenta no tiene acceso al centro seleccionado." };
    }
    throw error;
  }
}
