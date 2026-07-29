"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardPathForRole } from "@/lib/auth/roles";
import { getCurrentUserProfile } from "@/lib/auth/session";
import {
  ACTIVE_SCHOOL_COOKIE_MAX_AGE,
  ACTIVE_SCHOOL_COOKIE_NAME,
  getUserSchoolMemberships,
  resolveActiveSchoolContext,
  SchoolContextError
} from "@/lib/schools/context";
import type { ActiveSchoolContext } from "@/lib/schools/types";

export async function selectActiveSchool(formData: FormData) {
  const profile = await getCurrentUserProfile();
  if (!profile || !profile.active) {
    redirect("/login");
  }
  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const schoolId = String(formData.get("school_id") ?? "").trim();
  if (!schoolId) {
    redirect("/select-school?error=missing");
  }

  const { memberships, schemaAvailable } = await getUserSchoolMemberships(profile.id);
  if (!schemaAvailable) {
    redirect("/select-school?error=unavailable");
  }

  let context: ActiveSchoolContext;
  try {
    context = resolveActiveSchoolContext({
      profile,
      memberships,
      requestedSchoolId: schoolId
    });
  } catch (error) {
    if (error instanceof SchoolContextError) {
      redirect("/select-school?error=unauthorized");
    }
    throw error;
  }

  cookies().set(ACTIVE_SCHOOL_COOKIE_NAME, context.schoolId!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACTIVE_SCHOOL_COOKIE_MAX_AGE
  });

  revalidatePath("/", "layout");
  redirect(getDashboardPathForRole(context.role));
}

export async function clearActiveSchool() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "superadmin") {
    redirect("/login");
  }

  cookies().delete(ACTIVE_SCHOOL_COOKIE_NAME);
  revalidatePath("/", "layout");
  redirect("/dashboard/admin");
}
