import type { Profile } from "../src/lib/auth/session";
import { penafortBrand } from "../src/lib/branding/brand-config";
import {
  resolveActiveSchoolContext,
  SchoolContextError
} from "../src/lib/schools/context";
import { getSchoolBranding } from "../src/lib/schools/branding";
import type {
  School,
  SchoolMembershipWithSchool
} from "../src/lib/schools/types";

const profile: Profile = {
  id: "20e10000-0000-4000-8000-000000000103",
  email: "qa.tutor@example.test",
  full_name: "QA Tutor",
  role: "tutor",
  active: true,
  must_change_password: false
};

const completeSchool: School = {
  id: "20e10000-0000-4000-8000-000000000001",
  name: "QA School",
  short_name: "QA School",
  slug: "qa-school",
  status: "active",
  active: true,
  logo_url: "/qa-logo.svg",
  primary_color: "#102030",
  secondary_color: "#405060",
  accent_color: "#708090",
  family_email_domain: "example.test",
  calendar_id: "qa-school-calendar",
  created_at: "2026-07-26T00:00:00.000Z",
  updated_at: "2026-07-26T00:00:00.000Z"
};

const activeMembership: SchoolMembershipWithSchool = {
  id: "20e10000-0000-4000-8000-000000000203",
  school_id: completeSchool.id,
  user_id: profile.id,
  role: "tutor",
  active: true,
  created_at: "2026-07-26T00:00:00.000Z",
  updated_at: "2026-07-26T00:00:00.000Z",
  school: completeSchool
};

const directorMembership: SchoolMembershipWithSchool = {
  ...activeMembership,
  id: "20e10000-0000-4000-8000-000000000202",
  role: "director"
};

const inactiveMembership: SchoolMembershipWithSchool = {
  ...activeMembership,
  id: "20e10000-0000-4000-8000-000000000205",
  active: false,
  role: "family"
};

const penafortSchool: School = {
  ...completeSchool,
  id: "20f20000-0000-4000-8000-000000000001",
  name: "Colegio Peñafort",
  short_name: "Peñafort",
  slug: "colegio-penafort",
  logo_url: "/branding/penafort-logo.jpg",
  primary_color: "#075985",
  secondary_color: "#0F172A",
  accent_color: "#0EA5E9",
  family_email_domain: "penafort.com",
  calendar_id: "fo7mnf4nmdge5cib93bfq77414@group.calendar.google.com"
};

const penafortMembership: SchoolMembershipWithSchool = {
  ...activeMembership,
  id: "20f20000-0000-4000-8000-000000000103",
  school_id: penafortSchool.id,
  school: penafortSchool
};

const superadminProfile: Profile = {
  ...profile,
  id: "20e10000-0000-4000-8000-000000000101",
  email: "qa.superadmin@example.test",
  full_name: "QA Superadmin",
  role: "superadmin"
};

const penafortSuperadminMembership: SchoolMembershipWithSchool = {
  ...penafortMembership,
  id: "20f20000-0000-4000-8000-000000000101",
  user_id: superadminProfile.id,
  role: "superadmin"
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function expectContextError(
  operation: () => unknown,
  code: SchoolContextError["code"]
) {
  try {
    operation();
  } catch (error) {
    assert(error instanceof SchoolContextError, "Expected SchoolContextError.");
    assert(error.code === code, `Expected ${code}, received ${error.code}.`);
    return;
  }

  throw new Error(`Expected ${code}, but no error was thrown.`);
}

function activeMemberships(
  memberships: SchoolMembershipWithSchool[]
): SchoolMembershipWithSchool[] {
  return memberships.filter(
    (membership) => membership.active && membership.school.active
  );
}

const membershipContext = resolveActiveSchoolContext({
  profile,
  memberships: activeMemberships([penafortMembership]),
  allowLegacyFallback: false
});

assert(membershipContext.source === "membership", "Active membership was not selected.");
assert(membershipContext.schoolId === penafortSchool.id, "Wrong school selected.");
assert(membershipContext.role === "tutor", "Wrong membership role selected.");
assert(
  membershipContext.branding.primaryColor === penafortSchool.primary_color,
  "Peñafort branding was not applied."
);

const matchingRoleContext = resolveActiveSchoolContext({
  profile,
  memberships: activeMemberships([directorMembership, activeMembership]),
  allowLegacyFallback: false
});

assert(
  matchingRoleContext.role === "tutor",
  "The membership matching the profile role was not selected."
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: { ...profile, role: "family" },
      memberships: activeMemberships([
        directorMembership,
        activeMembership
      ]),
      allowLegacyFallback: false
    }),
  "SCHOOL_ROLE_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile,
      memberships: activeMemberships([inactiveMembership]),
      allowLegacyFallback: false
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile,
      memberships: activeMemberships([
        activeMembership,
        penafortMembership
      ]),
      allowLegacyFallback: false
    }),
  "SCHOOL_SELECTION_REQUIRED"
);

const requestedSchoolContext = resolveActiveSchoolContext({
  profile,
  memberships: activeMemberships([
    activeMembership,
    penafortMembership
  ]),
  requestedSchoolId: penafortSchool.id,
  allowLegacyFallback: false
});

assert(
  requestedSchoolContext.schoolId === penafortSchool.id,
  "The requested school was not selected from multiple memberships."
);

const requestedQaSchoolContext = resolveActiveSchoolContext({
  profile,
  memberships: activeMemberships([
    activeMembership,
    penafortMembership
  ]),
  requestedSchoolId: completeSchool.id,
  allowLegacyFallback: false
});

assert(
  requestedQaSchoolContext.schoolId === completeSchool.id,
  "QA School was not selected explicitly."
);

const superadminContext = resolveActiveSchoolContext({
  profile: superadminProfile,
  memberships: activeMemberships([penafortSuperadminMembership]),
  requestedSchoolId: penafortSchool.id,
  allowLegacyFallback: false
});

assert(
  superadminContext.role === "superadmin",
  "Global superadmin did not retain its Peñafort membership role."
);
assert(
  superadminProfile.role === "superadmin",
  "Global superadmin profile role changed."
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile,
      memberships: activeMemberships([activeMembership, penafortMembership]),
      requestedSchoolId: "20e10000-0000-4000-8000-000000000999",
      allowLegacyFallback: false
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile,
      memberships: activeMemberships([]),
      requestedSchoolId: penafortSchool.id,
      allowLegacyFallback: true
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

const legacyContext = resolveActiveSchoolContext({
  profile,
  memberships: activeMemberships([]),
  allowLegacyFallback: true
});

assert(legacyContext.source === "legacy-profile", "Legacy fallback was not selected.");
assert(legacyContext.schoolId === null, "Legacy fallback unexpectedly grants a school.");
assert(
  legacyContext.branding.logoUrl === penafortBrand.assets.logo,
  "Legacy Peñafort branding fallback changed."
);

const incompleteBranding = getSchoolBranding({
  ...completeSchool,
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  family_email_domain: null,
  calendar_id: null
});

assert(
  incompleteBranding.logoUrl === penafortBrand.assets.logo,
  "Incomplete branding does not use the approved logo fallback."
);
assert(
  incompleteBranding.primaryColor === penafortBrand.colors.primary,
  "Incomplete branding does not use the approved color fallback."
);

console.log("School context and branding checks passed.");
