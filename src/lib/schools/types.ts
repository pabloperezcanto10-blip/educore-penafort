import type { Role } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";

export type School = Database["public"]["Tables"]["schools"]["Row"];
export type SchoolMembership = Database["public"]["Tables"]["school_memberships"]["Row"];
export type SchoolRole = Role;

export type SchoolBranding = {
  name: string;
  shortName: string;
  productName: string;
  logoUrl: string;
  iconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  foregroundColor: string;
  familyEmailDomain: string | null;
  calendarId: string | null;
  poweredBy: string;
};

export type SchoolMembershipWithSchool = SchoolMembership & {
  school: School;
};

export type ActiveSchoolContext = {
  userId: string;
  schoolId: string | null;
  membershipId: string | null;
  role: SchoolRole;
  school: School | null;
  branding: SchoolBranding;
  source: "membership" | "legacy-profile";
};
