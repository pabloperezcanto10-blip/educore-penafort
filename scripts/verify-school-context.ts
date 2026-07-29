import type { Profile } from "../src/lib/auth/session";
import {
  resolveActiveSchoolContext,
  SchoolContextError
} from "../src/lib/schools/context";
import {
  getSchoolBranding,
  platformBranding
} from "../src/lib/schools/branding";
import type {
  School,
  SchoolMembershipWithSchool
} from "../src/lib/schools/types";

const tutorProfile: Profile = {
  id: "20e10000-0000-4000-8000-000000000103",
  email: "qa.tutor@example.test",
  full_name: "QA Tutor",
  role: "tutor",
  active: true,
  must_change_password: false
};

const qaSchool: School = {
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

const secondSchool: School = {
  ...qaSchool,
  id: "20f20000-0000-4000-8000-000000000001",
  name: "Second QA School",
  short_name: "Second QA",
  slug: "second-qa-school"
};

function membership({
  id,
  school,
  userId = tutorProfile.id,
  role = "tutor",
  active = true
}: {
  id: string;
  school: School;
  userId?: string;
  role?: SchoolMembershipWithSchool["role"];
  active?: boolean;
}): SchoolMembershipWithSchool {
  return {
    id,
    school_id: school.id,
    user_id: userId,
    role,
    active,
    created_at: "2026-07-26T00:00:00.000Z",
    updated_at: "2026-07-26T00:00:00.000Z",
    school
  };
}

const qaTutorMembership = membership({
  id: "20e10000-0000-4000-8000-000000000203",
  school: qaSchool
});
const secondTutorMembership = membership({
  id: "20f20000-0000-4000-8000-000000000203",
  school: secondSchool
});
const qaDirectorMembership = membership({
  id: "20e10000-0000-4000-8000-000000000202",
  school: qaSchool,
  role: "director"
});
const secondDirectorMembership = membership({
  id: "20f20000-0000-4000-8000-000000000202",
  school: secondSchool,
  role: "director"
});
const qaFamilyMembership = membership({
  id: "20e10000-0000-4000-8000-000000000204",
  school: qaSchool,
  role: "family"
});
const secondFamilyMembership = membership({
  id: "20f20000-0000-4000-8000-000000000204",
  school: secondSchool,
  role: "family"
});

const superadminProfile: Profile = {
  ...tutorProfile,
  id: "20e10000-0000-4000-8000-000000000101",
  email: "qa.superadmin@example.test",
  role: "superadmin"
};
const superadminMemberships = [
  membership({
    id: "20e10000-0000-4000-8000-000000000101",
    school: qaSchool,
    userId: superadminProfile.id,
    role: "superadmin"
  }),
  membership({
    id: "20f20000-0000-4000-8000-000000000101",
    school: secondSchool,
    userId: superadminProfile.id,
    role: "superadmin"
  })
];

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

const singleContext = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [qaTutorMembership]
});
assert(singleContext.schoolId === qaSchool.id, "Single membership did not auto-select.");
assert(singleContext.membershipRole === "tutor", "Membership role was not authoritative.");
assert(singleContext.membershipStatus === "active", "Membership status is not active.");
assert(singleContext.availableSchools.length === 1, "Available schools are incorrect.");
assert(singleContext.source === "membership", "Membership source was not recorded.");

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: tutorProfile,
      memberships: [qaTutorMembership, secondTutorMembership]
    }),
  "SCHOOL_SELECTION_REQUIRED"
);

const selectedSecondSchool = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [qaTutorMembership, secondTutorMembership],
  requestedSchoolId: secondSchool.id
});
assert(selectedSecondSchool.schoolId === secondSchool.id, "Explicit school selection failed.");
assert(selectedSecondSchool.availableSchools.length === 2, "Multischool options are incomplete.");
const selectedFirstAgain = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [qaTutorMembership, secondTutorMembership],
  requestedSchoolId: qaSchool.id
});
assert(
  selectedFirstAgain.schoolId === qaSchool.id,
  "Changing school A -> B -> A did not restore the requested context."
);

for (const scenario of [
  {
    role: "director" as const,
    memberships: [qaDirectorMembership, secondDirectorMembership]
  },
  {
    role: "tutor" as const,
    memberships: [qaTutorMembership, secondTutorMembership]
  },
  {
    role: "family" as const,
    memberships: [qaFamilyMembership, secondFamilyMembership]
  }
]) {
  const profile = {
    ...tutorProfile,
    role: scenario.role
  };
  expectContextError(
    () =>
      resolveActiveSchoolContext({
        profile,
        memberships: scenario.memberships
      }),
    "SCHOOL_SELECTION_REQUIRED"
  );
  for (const school of [qaSchool, secondSchool]) {
    const context = resolveActiveSchoolContext({
      profile,
      memberships: scenario.memberships,
      requestedSchoolId: school.id
    });
    assert(
      context.schoolId === school.id,
      `${scenario.role} did not resolve the requested school.`
    );
    assert(
      context.role === scenario.role,
      `${scenario.role} did not retain the membership role.`
    );
  }
}

const roleMatched = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [qaDirectorMembership, qaTutorMembership],
  requestedSchoolId: qaSchool.id
});
assert(roleMatched.role === "tutor", "The authorized profile role was not selected.");

const membershipOverridesLegacyProfileRole = resolveActiveSchoolContext({
  profile: { ...tutorProfile, role: "director" },
  memberships: [qaTutorMembership]
});
assert(
  membershipOverridesLegacyProfileRole.role === "tutor",
  "A legacy profile role overrode the only active membership."
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: { ...tutorProfile, role: "family" },
      memberships: [qaDirectorMembership, qaTutorMembership],
      requestedSchoolId: qaSchool.id
    }),
  "SCHOOL_ROLE_REQUIRED"
);

const activeMembershipIgnoresInactiveSecondSchool = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [
    qaTutorMembership,
    { ...secondTutorMembership, active: false }
  ]
});
assert(
  activeMembershipIgnoresInactiveSecondSchool.schoolId === qaSchool.id,
  "An inactive membership affected automatic school selection."
);
assert(
  activeMembershipIgnoresInactiveSecondSchool.availableSchools.length === 1,
  "An inactive membership was exposed as an available school."
);

const activeMembershipIgnoresInactiveSchool = resolveActiveSchoolContext({
  profile: tutorProfile,
  memberships: [
    qaTutorMembership,
    {
      ...secondTutorMembership,
      school: { ...secondSchool, active: false }
    }
  ]
});
assert(
  activeMembershipIgnoresInactiveSchool.schoolId === qaSchool.id,
  "An inactive school affected automatic school selection."
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: tutorProfile,
      memberships: [{ ...qaTutorMembership, active: false }]
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: tutorProfile,
      memberships: [
        { ...qaTutorMembership, school: { ...qaSchool, active: false } }
      ]
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: tutorProfile,
      memberships: []
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

expectContextError(
  () =>
    resolveActiveSchoolContext({
      profile: tutorProfile,
      memberships: [qaTutorMembership],
      requestedSchoolId: secondSchool.id
    }),
  "SCHOOL_MEMBERSHIP_REQUIRED"
);

const globalSuperadmin = resolveActiveSchoolContext({
  profile: superadminProfile,
  memberships: superadminMemberships
});
assert(globalSuperadmin.schoolId === null, "Global superadmin unexpectedly selected a school.");
assert(globalSuperadmin.isGlobalSuperadmin, "Global superadmin flag is missing.");
assert(globalSuperadmin.availableSchools.length === 2, "Global school options are incomplete.");
assert(globalSuperadmin.source === "global-superadmin", "Global source is incorrect.");
assert(
  globalSuperadmin.branding.logoUrl === platformBranding.logoUrl,
  "Global superadmin inherited a school brand."
);

const contextualSuperadmin = resolveActiveSchoolContext({
  profile: superadminProfile,
  memberships: superadminMemberships,
  requestedSchoolId: secondSchool.id
});
assert(contextualSuperadmin.schoolId === secondSchool.id, "Superadmin context selection failed.");
assert(contextualSuperadmin.isGlobalSuperadmin, "Context selection removed global capability.");

const incompleteBranding = getSchoolBranding({
  ...qaSchool,
  logo_url: null,
  primary_color: null,
  secondary_color: null,
  accent_color: null,
  family_email_domain: null,
  calendar_id: null
});
assert(
  incompleteBranding.logoUrl === platformBranding.logoUrl,
  "Visual fallback changed unexpectedly."
);
assert(
  incompleteBranding.primaryColor === platformBranding.primaryColor,
  "Visual color fallback changed unexpectedly."
);

console.log("ActiveSchoolContext deterministic checks passed.");
