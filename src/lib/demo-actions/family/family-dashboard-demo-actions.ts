import type { FamilyDashboardRoutes } from "@/components/dashboards/family/family-dashboard-view";
import { getExperienceModuleHref } from "@/components/experience/experience-data";
import { createDemoActionResult } from "@/lib/demo-actions/types";

export const familyDashboardExperienceRoutes: FamilyDashboardRoutes = {
  root: "/experience/familia",
  calendar: getExperienceModuleHref("familia", "calendar"),
  communications: getExperienceModuleHref("familia", "communications"),
  grades: getExperienceModuleHref("familia", "gradebook"),
  student: getExperienceModuleHref("familia", "students")
};

export function createFamilyDashboardDemoActions() {
  return {
    reset: () => createDemoActionResult("Experience familiar restablecida.")
  };
}
