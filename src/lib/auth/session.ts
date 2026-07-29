import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardPathForRole, isRole, normalizeRole, type Role } from "@/lib/auth/roles";
import type { ActiveSchoolContext } from "@/lib/schools/types";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  active: boolean;
  must_change_password: boolean;
};

export type AuthorizedProfile = Profile & {
  schoolContext: ActiveSchoolContext;
};

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active,must_change_password")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError && profileError.message.includes("must_change_password")) {
    const { data: fallbackProfile } = await supabase
      .from("profiles")
      .select("id,email,full_name,role,active")
      .eq("id", user.id)
      .maybeSingle<Omit<Profile, "must_change_password">>();

    if (fallbackProfile && isRole(fallbackProfile.role)) {
      return {
        ...fallbackProfile,
        role: normalizeRole(fallbackProfile.role),
        must_change_password: false
      };
    }
  }

  if (!profile || !isRole(profile.role)) {
    return null;
  }

  return {
    ...profile,
    role: normalizeRole(profile.role),
    must_change_password: Boolean(profile.must_change_password)
  };
}

export async function requireRole(
  role: Role | readonly Role[]
): Promise<AuthorizedProfile> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.active) {
    redirect("/login");
  }

  if (profile.must_change_password) {
    redirect("/change-password");
  }

  const { requireSchoolContext } = await import("@/lib/schools/context");
  const schoolContext = await requireSchoolContext(undefined, profile);

  const allowedRoles = Array.isArray(role) ? role : [role];
  if (!allowedRoles.includes(schoolContext.role)) {
    redirect(getDashboardPathForRole(schoolContext.role));
  }

  return {
    ...profile,
    role: schoolContext.role,
    schoolContext
  };
}
