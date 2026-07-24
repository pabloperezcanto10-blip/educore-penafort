import { redirect } from "next/navigation";
import { getCurrentUserProfile, type Profile } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getSchoolBranding } from "@/lib/schools/branding";
import type {
  ActiveSchoolContext,
  School,
  SchoolMembership,
  SchoolMembershipWithSchool,
  SchoolRole
} from "@/lib/schools/types";

type MembershipQueryResult = {
  memberships: SchoolMembershipWithSchool[];
  schemaAvailable: boolean;
  membershipRowsFound: boolean;
};

// Temporary compatibility bridge. Remove after the Peñafort membership
// backfill is verified and every protected route requires a membership.
const LEGACY_PROFILE_FALLBACK_ENABLED = true;

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

function chooseMembershipRole(
  memberships: SchoolMembershipWithSchool[],
  legacyRole: Role
): SchoolMembershipWithSchool {
  const matchingLegacyRole = memberships.find((membership) => membership.role === legacyRole);

  if (matchingLegacyRole) {
    return matchingLegacyRole;
  }

  if (memberships.length === 1) {
    return memberships[0];
  }

  throw new SchoolContextError(
    "El usuario tiene varios roles activos en el centro y debe seleccionar uno.",
    "SCHOOL_ROLE_REQUIRED"
  );
}

export function resolveActiveSchoolContext({
  profile,
  memberships,
  requestedSchoolId,
  allowLegacyFallback
}: {
  profile: Profile;
  memberships: SchoolMembershipWithSchool[];
  requestedSchoolId?: string;
  allowLegacyFallback: boolean;
}): ActiveSchoolContext {
  if (memberships.length === 0) {
    if (!allowLegacyFallback || requestedSchoolId) {
      throw new SchoolContextError(
        "El usuario no tiene una membresía activa para el centro solicitado.",
        "SCHOOL_MEMBERSHIP_REQUIRED"
      );
    }

    return {
      userId: profile.id,
      schoolId: null,
      membershipId: null,
      role: profile.role,
      school: null,
      branding: getSchoolBranding(null),
      source: "legacy-profile"
    };
  }

  const membershipsBySchool = new Map<string, SchoolMembershipWithSchool[]>();

  for (const membership of memberships) {
    const existing = membershipsBySchool.get(membership.school_id) ?? [];
    existing.push(membership);
    membershipsBySchool.set(membership.school_id, existing);
  }

  let selectedMemberships: SchoolMembershipWithSchool[] | undefined;

  if (requestedSchoolId) {
    selectedMemberships = membershipsBySchool.get(requestedSchoolId);

    if (!selectedMemberships) {
      throw new SchoolContextError(
        "El usuario no tiene una membresía activa para el centro solicitado.",
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

  if (!selectedMemberships || selectedMemberships.length === 0) {
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
    role: membership.role,
    school: membership.school,
    branding: getSchoolBranding(membership.school),
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
      return {
        memberships: [],
        schemaAvailable: false,
        membershipRowsFound: false
      };
    }

    throw new SchoolContextError(
      "No se pudieron consultar las membresías del usuario.",
      "SCHOOL_CONTEXT_UNAVAILABLE"
    );
  }

  const schoolIds = [...new Set((memberships ?? []).map((membership) => membership.school_id))];

  if (schoolIds.length === 0) {
    return {
      memberships: [],
      schemaAvailable: true,
      membershipRowsFound: false
    };
  }

  const { data: schools, error: schoolsError } = await supabase
    .from("schools")
    .select(
      "id,name,short_name,slug,status,active,logo_url,primary_color,secondary_color,accent_color,family_email_domain,calendar_id,created_at,updated_at"
    )
    .in("id", schoolIds)
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
    return school && school.active ? [{ ...membership, school }] : [];
  });

  return {
    memberships: resolvedMemberships,
    schemaAvailable: true,
    membershipRowsFound: true
  };
}

export async function getActiveSchoolContext(
  requestedSchoolId?: string
): Promise<ActiveSchoolContext | null> {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return null;
  }

  const { memberships, schemaAvailable, membershipRowsFound } =
    await getUserSchoolMemberships(profile.id);

  return resolveActiveSchoolContext({
    profile,
    memberships,
    requestedSchoolId,
    allowLegacyFallback:
      LEGACY_PROFILE_FALLBACK_ENABLED && (!schemaAvailable || !membershipRowsFound)
  });
}

export async function requireSchoolContext(
  requestedSchoolId?: string
): Promise<ActiveSchoolContext> {
  const context = await getActiveSchoolContext(requestedSchoolId);

  if (!context) {
    redirect("/login");
  }

  return context;
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
