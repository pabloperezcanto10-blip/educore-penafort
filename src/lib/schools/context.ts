import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUserProfile, type Profile } from "@/lib/auth/session";
import { getDashboardPathForRole, type Role } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSchoolBranding, platformBranding } from "@/lib/schools/branding";
import type {
  ActiveSchoolContext,
  AvailableSchool,
  School,
  SchoolMembership,
  SchoolMembershipWithSchool,
  SchoolRole
} from "@/lib/schools/types";

export const ACTIVE_SCHOOL_COOKIE_NAME = "educacora_active_school_id";
export const ACTIVE_SCHOOL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type MembershipQueryResult = {
  memberships: SchoolMembershipWithSchool[];
  schemaAvailable: boolean;
};

export class SchoolContextError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SCHOOL_CONTEXT_UNAVAILABLE"
      | "SCHOOL_MEMBERSHIP_REQUIRED"
      | "SCHOOL_SELECTION_REQUIRED"
      | "SCHOOL_ROLE_REQUIRED"
  ) {
    super(message);
    this.name = "SchoolContextError";
  }
}

function isMissingMultitenantSchemaError(code: string | undefined) {
  return code === "42P01" || code === "PGRST205";
}

function activeMemberships(
  memberships: SchoolMembershipWithSchool[]
): SchoolMembershipWithSchool[] {
  return memberships.filter(
    (membership) => membership.active && membership.school.active
  );
}

function buildAvailableSchools(
  memberships: SchoolMembershipWithSchool[]
): AvailableSchool[] {
  const schools = new Map<string, AvailableSchool>();

  for (const membership of memberships) {
    const existing = schools.get(membership.school_id);
    if (existing) {
      if (!existing.roles.includes(membership.role)) {
        existing.roles.push(membership.role);
      }
      continue;
    }

    schools.set(membership.school_id, {
      id: membership.school_id,
      name: membership.school.name,
      shortName: membership.school.short_name,
      logoUrl: membership.school.logo_url,
      roles: [membership.role]
    });
  }

  return [...schools.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

function chooseMembershipRole(
  memberships: SchoolMembershipWithSchool[],
  profileRole: Role
): SchoolMembershipWithSchool {
  const matchingProfileRole = memberships.find(
    (membership) => membership.role === profileRole
  );

  if (matchingProfileRole) {
    return matchingProfileRole;
  }

  const onlyMembership = memberships.length === 1 ? memberships.at(0) : undefined;
  if (onlyMembership) {
    return onlyMembership;
  }

  throw new SchoolContextError(
    "El usuario tiene varios roles activos en el centro y debe seleccionar uno.",
    "SCHOOL_ROLE_REQUIRED"
  );
}

function globalSuperadminContext({
  profile,
  memberships
}: {
  profile: Profile;
  memberships: SchoolMembershipWithSchool[];
}): ActiveSchoolContext {
  return {
    userId: profile.id,
    schoolId: null,
    membershipId: null,
    membershipRole: "superadmin",
    membershipStatus: null,
    role: "superadmin",
    school: null,
    isGlobalSuperadmin: true,
    availableSchools: buildAvailableSchools(memberships),
    availableMemberships: memberships,
    requiresSchoolSelection: false,
    branding: platformBranding,
    activeAcademicYearId: null,
    source: "global-superadmin"
  };
}

export function resolveActiveSchoolContext({
  profile,
  memberships,
  requestedSchoolId
}: {
  profile: Profile;
  memberships: SchoolMembershipWithSchool[];
  requestedSchoolId?: string;
}): ActiveSchoolContext {
  const validMemberships = activeMemberships(memberships);
  const availableSchools = buildAvailableSchools(validMemberships);

  if (profile.role === "superadmin" && !requestedSchoolId) {
    return globalSuperadminContext({ profile, memberships: validMemberships });
  }

  if (validMemberships.length === 0) {
    throw new SchoolContextError(
      "El usuario no tiene ninguna membresia activa.",
      "SCHOOL_MEMBERSHIP_REQUIRED"
    );
  }

  const membershipsBySchool = new Map<string, SchoolMembershipWithSchool[]>();
  for (const membership of validMemberships) {
    const schoolMemberships = membershipsBySchool.get(membership.school_id) ?? [];
    schoolMemberships.push(membership);
    membershipsBySchool.set(membership.school_id, schoolMemberships);
  }

  let selectedMemberships: SchoolMembershipWithSchool[] | undefined;
  if (requestedSchoolId) {
    selectedMemberships = membershipsBySchool.get(requestedSchoolId);
    if (!selectedMemberships) {
      throw new SchoolContextError(
        "El usuario no tiene una membresia activa para el centro solicitado.",
        "SCHOOL_MEMBERSHIP_REQUIRED"
      );
    }
  } else if (membershipsBySchool.size === 1) {
    selectedMemberships = membershipsBySchool.values().next().value;
  } else {
    throw new SchoolContextError(
      "El usuario pertenece a varios centros y debe seleccionar uno.",
      "SCHOOL_SELECTION_REQUIRED"
    );
  }

  if (!selectedMemberships?.length) {
    throw new SchoolContextError(
      "No se pudo resolver el contexto activo del centro.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  const membership = chooseMembershipRole(selectedMemberships, profile.role);

  return {
    userId: profile.id,
    schoolId: membership.school_id,
    membershipId: membership.id,
    membershipRole: membership.role,
    membershipStatus: "active",
    role: membership.role,
    school: membership.school,
    isGlobalSuperadmin: profile.role === "superadmin",
    availableSchools,
    availableMemberships: validMemberships,
    requiresSchoolSelection: false,
    branding: getSchoolBranding(membership.school),
    activeAcademicYearId: null,
    source: "membership"
  };
}

export async function getUserSchoolMemberships(
  userId: string
): Promise<MembershipQueryResult> {
  const supabase = await createClient();
  const { data: memberships, error: membershipsError } = await supabase
    .from("school_memberships")
    .select("id,school_id,user_id,role,active,created_at,updated_at")
    .eq("user_id", userId)
    .eq("active", true)
    .returns<SchoolMembership[]>();

  if (membershipsError) {
    if (isMissingMultitenantSchemaError(membershipsError.code)) {
      return { memberships: [], schemaAvailable: false };
    }

    throw new SchoolContextError(
      "No se pudieron consultar las membresias del usuario.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  const schoolIds = [...new Set((memberships ?? []).map(({ school_id }) => school_id))];
  if (schoolIds.length === 0) {
    return { memberships: [], schemaAvailable: true };
  }

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select(
      "id,name,short_name,slug,status,active,logo_url,primary_color,secondary_color,accent_color,family_email_domain,calendar_id,created_at,updated_at"
    )
    .in("id", schoolIds)
    .eq("active", true)
    .returns<School[]>();

  if (schoolsError) {
    throw new SchoolContextError(
      "No se pudieron consultar los centros del usuario.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  const schoolsById = new Map((schools ?? []).map((school) => [school.id, school]));
  const resolvedMemberships = (memberships ?? []).flatMap((membership) => {
    const school = schoolsById.get(membership.school_id);
    return school ? [{ ...membership, school }] : [];
  });

  return { memberships: resolvedMemberships, schemaAvailable: true };
}

async function addActiveAcademicYear(
  context: ActiveSchoolContext
): Promise<ActiveSchoolContext> {
  if (!context.schoolId) {
    return context;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", context.schoolId)
    .eq("active", true)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new SchoolContextError(
      "No se pudo resolver el curso academico del centro activo.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  return { ...context, activeAcademicYearId: data?.id ?? null };
}

export async function getActiveSchoolContext(
  requestedSchoolId?: string,
  suppliedProfile?: Profile
): Promise<ActiveSchoolContext | null> {
  const profile = suppliedProfile ?? (await getCurrentUserProfile());
  if (!profile) {
    return null;
  }

  const { memberships, schemaAvailable } = await getUserSchoolMemberships(profile.id);
  if (!schemaAvailable) {
    throw new SchoolContextError(
      "La infraestructura multitenant no esta disponible.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  const persistedSchoolId = requestedSchoolId
    ? undefined
    : cookies().get(ACTIVE_SCHOOL_COOKIE_NAME)?.value;
  const selectedSchoolId = requestedSchoolId ?? persistedSchoolId;

  try {
    return await addActiveAcademicYear(
      resolveActiveSchoolContext({
        profile,
        memberships,
        requestedSchoolId: selectedSchoolId
      })
    );
  } catch (error) {
    if (
      !requestedSchoolId &&
      persistedSchoolId &&
      error instanceof SchoolContextError &&
      error.code === "SCHOOL_MEMBERSHIP_REQUIRED"
    ) {
      return addActiveAcademicYear(
        resolveActiveSchoolContext({ profile, memberships })
      );
    }

    throw error;
  }
}

export function getSchoolContextRedirectPath(error: unknown): string | null {
  if (!(error instanceof SchoolContextError)) {
    return null;
  }

  if (error.code === "SCHOOL_MEMBERSHIP_REQUIRED") {
    return "/no-school";
  }

  if (
    error.code === "SCHOOL_SELECTION_REQUIRED" ||
    error.code === "SCHOOL_ROLE_REQUIRED"
  ) {
    return "/select-school";
  }

  return null;
}

export async function getAuthenticatedEntryPath(profile: Profile): Promise<string> {
  try {
    const context = await getActiveSchoolContext(undefined, profile);
    return context
      ? getDashboardPathForRole(context.role)
      : "/login";
  } catch (error) {
    return getSchoolContextRedirectPath(error) ?? "/no-school";
  }
}

export async function requireSchoolContext(
  requestedSchoolId?: string,
  suppliedProfile?: Profile
): Promise<ActiveSchoolContext> {
  try {
    const context = await getActiveSchoolContext(requestedSchoolId, suppliedProfile);
    if (!context) {
      redirect("/login");
    }
    return context;
  } catch (error) {
    const redirectPath = getSchoolContextRedirectPath(error);
    if (redirectPath) {
      redirect(redirectPath);
    }
    throw error;
  }
}

export async function requireOperationalSchoolContext(
  suppliedProfile?: Profile
): Promise<ActiveSchoolContext & { schoolId: string }> {
  const context = await requireSchoolContext(undefined, suppliedProfile);
  if (!context.schoolId) {
    redirect("/select-school");
  }
  return context as ActiveSchoolContext & { schoolId: string };
}

export async function requireSchoolRole(
  allowedRoles: readonly SchoolRole[],
  requestedSchoolId?: string
): Promise<ActiveSchoolContext> {
  const context = await requireSchoolContext(requestedSchoolId);
  if (!allowedRoles.includes(context.role)) {
    throw new SchoolContextError(
      "El usuario no tiene un rol autorizado en el centro activo.",
      "SCHOOL_ROLE_REQUIRED"
    );
  }
  return context;
}
