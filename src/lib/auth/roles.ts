export const ROLES = ["superadmin", "director", "tutor", "family"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Superadmin",
  director: "Director",
  tutor: "Tutor",
  family: "Family"
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

export function normalizeRole(value: unknown): Role {
  if (isRole(value)) {
    return value;
  }

  if (value === "familia") {
    return "family";
  }

  return "family";
}

export function getRoleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

export function getDashboardPathForRole(role: Role): string {
  if (role === "superadmin") {
    return "/dashboard/admin";
  }

  return `/dashboard/${role}`;
}
